import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';
import { writeAuditLog } from '../lib/audit';
import { authenticate } from '../middleware/authenticate';
import { csrfProtect } from '../middleware/csrf-protect';
import { requireRole } from '../middleware/require-role';
import { validate } from '../middleware/validate';
import {
  createPromotionSchema,
  promotionIdParamsSchema,
  updatePromotionSchema,
  type CreatePromotionInput,
  type UpdatePromotionInput
} from '../schemas/promotion.schemas';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const isPrivileged = request.user!.role === 'ADMIN' || request.user!.role === 'MANAGER';

    const promotions = await prisma.promotion.findMany({
      where: isPrivileged ? {} : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { discountPercent: 'desc' }, { createdAt: 'desc' }]
    });

    response.json({ promotions });
  })
);

router.post(
  '/',
  requireRole(['ADMIN', 'MANAGER']),
  csrfProtect,
  validate(createPromotionSchema),
  asyncHandler(async (request, response) => {
    const body = request.body as CreatePromotionInput;

    const promotion = await prisma.promotion.create({
      data: {
        name: body.name,
        minDistinctGames: body.minDistinctGames,
        discountPercent: body.discountPercent,
        isActive: body.isActive ?? true
      }
    });

    await writeAuditLog({
      action: 'PROMOTION_CREATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: { promotionId: promotion.id, name: promotion.name }
    });

    response.status(201).json({ promotion });
  })
);

router.patch(
  '/:promotionId',
  requireRole(['ADMIN', 'MANAGER']),
  csrfProtect,
  validate(promotionIdParamsSchema, 'params'),
  validate(updatePromotionSchema),
  asyncHandler(async (request, response) => {
    const { promotionId } = request.params as { promotionId: string };
    const body = request.body as UpdatePromotionInput;

    const promotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: body
    });

    await writeAuditLog({
      action: 'PROMOTION_UPDATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: { promotionId, changes: body }
    });

    response.json({ promotion });
  })
);

export { router as promotionRouter };
