import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { HttpError } from '../lib/http-error';
import { prisma } from '../lib/prisma';
import { writeAuditLog } from '../lib/audit';
import { registerPurchaseClient, unregisterPurchaseClient } from '../lib/purchase-broadcast';
import { authenticate } from '../middleware/authenticate';
import { csrfProtect } from '../middleware/csrf-protect';
import { requireRole } from '../middleware/require-role';
import { validate } from '../middleware/validate';
import { createGameSchema, updateGameSchema, gameIdParamsSchema } from '../schemas/game.schemas';
import type { CreateGameInput, UpdateGameInput } from '../schemas/game.schemas';

const router = Router();

// All game routes require an authenticated session
router.use(authenticate);

// GET /api/games
// ADMIN/MANAGER see all games (including inactive); USER sees only active games.
// Data visibility controlled server-side — client-side filtering alone is insufficient (OWASP A01).
router.get(
  '/',
  asyncHandler(async (request, response) => {
    const isPrivileged = request.user!.role === 'ADMIN' || request.user!.role === 'MANAGER';

    const games = await prisma.game.findMany({
      where: isPrivileged ? {} : { isActive: true },
      orderBy: [{ genre: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        genre: true,
        publisher: true,
        releaseYear: true,
        stock: true,
        isActive: true,
        _count: {
          select: { reviews: true, orders: true }
        }
      }
    });

    const completedOrders = await prisma.order.findMany({
      where: { status: 'COMPLETED' },
      select: {
        gameId: true,
        userId: true
      }
    });

    const purchaseStatsByGame = new Map<string, { completedOrdersCount: number; uniqueBuyersCount: number }>();
    const buyersByGame = new Map<string, Set<string>>();

    for (const entry of completedOrders) {
      const current = purchaseStatsByGame.get(entry.gameId) ?? { completedOrdersCount: 0, uniqueBuyersCount: 0 };
      current.completedOrdersCount += 1;
      purchaseStatsByGame.set(entry.gameId, current);

      const buyers = buyersByGame.get(entry.gameId) ?? new Set<string>();
      buyers.add(entry.userId);
      buyersByGame.set(entry.gameId, buyers);
    }

    const enrichedGames = games.map((game) => {
      const stats = purchaseStatsByGame.get(game.id);
      const buyers = buyersByGame.get(game.id);

      return {
        ...game,
        purchaseStats: {
          completedOrdersCount: stats?.completedOrdersCount ?? 0,
          uniqueBuyersCount: buyers?.size ?? 0
        }
      };
    });

    response.json({ games: enrichedGames });
  })
);

router.get('/live-purchases', (request, response) => {
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders();

  registerPurchaseClient(response);

  response.write(`event: ready\\ndata: ${JSON.stringify({ ok: true })}\\n\\n`);

  const keepAlive = setInterval(() => {
    response.write('event: ping\\ndata: {}\\n\\n');
  }, 25000);

  request.on('close', () => {
    clearInterval(keepAlive);
    unregisterPurchaseClient(response);
  });
});

// POST /api/games — MANAGER or ADMIN only: add a new game to the catalog
// RBAC enforced at middleware level, not just on the frontend (OWASP A01)
router.post(
  '/',
  requireRole(['ADMIN', 'MANAGER']),
  csrfProtect,
  validate(createGameSchema),
  asyncHandler(async (request, response) => {
    const body = request.body as CreateGameInput;

    const game = await prisma.game.create({
      data: {
        title: body.title,
        description: body.description,
        price: body.price,
        genre: body.genre,
        publisher: body.publisher,
        releaseYear: body.releaseYear,
        stock: body.stock ?? 100
      }
    });

    await writeAuditLog({
      action: 'GAME_CREATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: { gameId: game.id, title: game.title, genre: game.genre }
    });

    response.status(201).json({ game });
  })
);

// PATCH /api/games/:gameId — MANAGER or ADMIN only: update game details or toggle active status
router.patch(
  '/:gameId',
  requireRole(['ADMIN', 'MANAGER']),
  csrfProtect,
  validate(gameIdParamsSchema, 'params'),
  validate(updateGameSchema),
  asyncHandler(async (request, response) => {
    const { gameId } = request.params as { gameId: string };
    const body = request.body as UpdateGameInput;

    const existing = await prisma.game.findUnique({ where: { id: gameId } });
    if (!existing) {
      throw new HttpError(404, 'Game not found.');
    }

    const game = await prisma.game.update({
      where: { id: gameId },
      data: body
    });

    await writeAuditLog({
      action: 'GAME_UPDATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: { gameId: game.id, changes: body }
    });

    response.json({ game });
  })
);

export { router as gameRouter };
