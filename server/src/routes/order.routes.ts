import { Router } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../lib/async-handler';
import { HttpError } from '../lib/http-error';
import { prisma } from '../lib/prisma';
import { writeAuditLog } from '../lib/audit';
import { broadcastPurchase } from '../lib/purchase-broadcast';
import { sendOrderCreatedEmail, sendOrderStatusChangedEmail } from '../lib/mailer';
import { authenticate } from '../middleware/authenticate';
import { csrfProtect } from '../middleware/csrf-protect';
import { requireRole } from '../middleware/require-role';
import { validate } from '../middleware/validate';
import { createOrderSchema, orderIdParamsSchema, updateOrderStatusSchema } from '../schemas/order.schemas';
import { buildOrderScope } from '../services/access.service';

const router = Router();

// All order endpoints require authentication
router.use(authenticate);

// GET /api/orders — returns orders scoped by role (RBAC enforced at query level)
router.get(
  '/',
  asyncHandler(async (request, response) => {
    const scope = buildOrderScope(request.user!);

    const orders = await prisma.order.findMany({
      where: scope,
      include: {
        game: { select: { id: true, title: true, genre: true } },
        user: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    response.json({ orders });
  })
);

// POST /api/orders — any authenticated user can place an order
// CSRF protection required because this mutates state (places an order, decrements stock)
router.post(
  '/',
  csrfProtect,
  validate(createOrderSchema),
  asyncHandler(async (request, response) => {
    const body = request.body as {
      gameId?: string;
      quantity?: number;
      items?: Array<{ gameId: string; quantity: number }>;
      address: string;
      phone: string;
    };

    const items = body.items?.length
      ? body.items
      : body.gameId && body.quantity
      ? [{ gameId: body.gameId, quantity: body.quantity }]
      : [];

    if (items.length === 0) {
      throw new HttpError(400, 'No order items provided.');
    }

    const groupedItems = new Map<string, number>();
    for (const item of items) {
      groupedItems.set(item.gameId, (groupedItems.get(item.gameId) ?? 0) + item.quantity);
    }

    const normalizedItems = Array.from(groupedItems.entries()).map(([gameId, quantity]) => ({ gameId, quantity }));
    const gameIds = normalizedItems.map((item) => item.gameId);

    const games = await prisma.game.findMany({
      where: {
        id: { in: gameIds },
        isActive: true
      }
    });

    if (games.length !== gameIds.length) {
      throw new HttpError(404, 'One or more selected games are not available.');
    }

    const gameMap = new Map(games.map((game) => [game.id, game]));

    for (const item of normalizedItems) {
      const game = gameMap.get(item.gameId);
      if (!game) {
        throw new HttpError(404, 'Selected game not found.');
      }

      if (game.stock < item.quantity) {
        throw new HttpError(400, `Insufficient stock for ${game.title}. Available: ${game.stock}.`);
      }
    }

    const subtotal = normalizedItems.reduce((sum, item) => {
      const game = gameMap.get(item.gameId)!;
      return sum + game.price * item.quantity;
    }, 0);

    const activePromotions = await prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: { discountPercent: 'desc' }
    });

    const distinctGamesCount = normalizedItems.length;
    const appliedPromotion = activePromotions.find((promotion) => distinctGamesCount >= promotion.minDistinctGames) ?? null;
    const totalDiscount = appliedPromotion ? Number(((subtotal * appliedPromotion.discountPercent) / 100).toFixed(2)) : 0;
    const orderGroupId = `grp_${crypto.randomUUID()}`;

    const lineSubtotals = normalizedItems.map((item) => {
      const game = gameMap.get(item.gameId)!;
      return {
        ...item,
        game,
        subtotal: game.price * item.quantity
      };
    });

    let discountRemainder = totalDiscount;

    const orders = await prisma.$transaction(async (transaction) => {
      const createdOrders = [];

      for (let index = 0; index < lineSubtotals.length; index += 1) {
        const line = lineSubtotals[index];
        const isLastLine = index === lineSubtotals.length - 1;
        const proportionalDiscount = totalDiscount > 0 ? Number(((line.subtotal / subtotal) * totalDiscount).toFixed(2)) : 0;
        const lineDiscount = isLastLine ? Number(discountRemainder.toFixed(2)) : Math.min(discountRemainder, proportionalDiscount);
        discountRemainder = Number((discountRemainder - lineDiscount).toFixed(2));

        const lineTotal = Number((line.subtotal - lineDiscount).toFixed(2));

        const created = await transaction.order.create({
          data: {
            userId: request.user!.id,
            gameId: line.gameId,
            groupId: orderGroupId,
            quantity: line.quantity,
            unitPrice: line.game.price,
            totalPrice: lineTotal,
            discountAmount: lineDiscount,
            promotionName: appliedPromotion?.name,
            status: 'PENDING',
            address: body.address,
            phone: body.phone
          },
          include: {
            game: { select: { id: true, title: true, genre: true } },
            user: { select: { id: true, fullName: true, email: true } }
          }
        });

        createdOrders.push(created);

        await transaction.game.update({
          where: { id: line.gameId },
          data: { stock: { decrement: line.quantity } }
        });
      }

      return createdOrders;
    });

    await writeAuditLog({
      action: 'ORDER_CREATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: {
        orderGroupId,
        ordersCount: orders.length,
        gameIds,
        subtotal,
        totalDiscount,
        promotionName: appliedPromotion?.name
      }
    });

    for (const order of orders) {
      broadcastPurchase({
        gameId: order.gameId,
        gameTitle: order.game?.title ?? 'Nieznana gra',
        quantity: order.quantity,
        timestamp: new Date().toISOString()
      });
    }

    const buyerEmail = orders[0]?.user?.email;
    if (buyerEmail) {
      await sendOrderCreatedEmail({
        email: buyerEmail,
        orderGroupId,
        totalPrice: Number((subtotal - totalDiscount).toFixed(2)),
        promotionName: appliedPromotion?.name ?? null
      });
    }

    response.status(201).json({
      order: orders[0],
      orders,
      summary: {
        groupId: orderGroupId,
        subtotal,
        discountAmount: totalDiscount,
        totalPrice: Number((subtotal - totalDiscount).toFixed(2)),
        promotionName: appliedPromotion?.name ?? null
      }
    });
  })
);

// PATCH /api/orders/:orderId/status — MANAGER or ADMIN: update order status
// Users cannot self-approve orders — privilege separation enforced via requireRole
router.patch(
  '/:orderId/status',
  requireRole(['ADMIN', 'MANAGER']),
  csrfProtect,
  validate(orderIdParamsSchema, 'params'),
  validate(updateOrderStatusSchema),
  asyncHandler(async (request, response) => {
    const { orderId } = request.params as { orderId: string };
    const { status } = request.body as { status: 'PENDING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' };

    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      throw new HttpError(404, 'Order not found.');
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new HttpError(400, 'Zakończonych i anulowanych zamówień nie można modyfikować.');
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        game: { select: { id: true, title: true } },
        user: { select: { id: true, email: true } }
      }
    });

    await writeAuditLog({
      action: 'ORDER_STATUS_UPDATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      targetUserId: order.userId,
      details: { orderId, previousStatus: existing.status, newStatus: status }
    });

    if (order.user?.email) {
      await sendOrderStatusChangedEmail({
        email: order.user.email,
        orderId: order.id,
        status,
        gameTitle: order.game?.title
      });
    }

    response.json({ order });
  })
);

export { router as orderRouter };
