import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { HttpError } from '../lib/http-error';
import { prisma } from '../lib/prisma';
import { writeAuditLog } from '../lib/audit';
import { authenticate } from '../middleware/authenticate';
import { csrfProtect } from '../middleware/csrf-protect';
import { validate } from '../middleware/validate';
import { createReviewSchema, reviewIdParamsSchema, updateReviewSchema } from '../schemas/review.schemas';
import { buildReviewScope } from '../services/access.service';

const router = Router();

// GET /api/reviews/public — no auth required, returns all reviews for landing page social proof
router.get(
  '/public',
  asyncHandler(async (_request, response) => {
    const reviews = await prisma.review.findMany({
      take: 20,
      include: {
        game: { select: { id: true, title: true, genre: true } },
        user: { select: { id: true, fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    response.json({ reviews });
  })
);

// All subsequent endpoints require authentication
router.use(authenticate);

// GET /api/reviews — RBAC scoped: USER sees own, MANAGER/ADMIN see all
router.get(
  '/',
  asyncHandler(async (request, response) => {
    const scope = buildReviewScope(request.user!);

    const reviews = await prisma.review.findMany({
      where: scope,
      include: {
        game: { select: { id: true, title: true, genre: true } },
        user: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    response.json({ reviews });
  })
);

// POST /api/reviews — any authenticated user; one review per game per user
router.post(
  '/',
  csrfProtect,
  validate(createReviewSchema),
  asyncHandler(async (request, response) => {
    const { gameId, rating, comment } = request.body as { gameId: string; rating: number; comment: string };

    const game = await prisma.game.findUnique({ where: { id: gameId, isActive: true } });
    if (!game) throw new HttpError(404, 'Game not found.');

    const existing = await prisma.review.findUnique({
      where: { userId_gameId: { userId: request.user!.id, gameId } }
    });
    if (existing) throw new HttpError(409, 'You have already reviewed this game.');

    const review = await prisma.review.create({
      data: { userId: request.user!.id, gameId, rating, comment },
      include: { game: { select: { id: true, title: true } } }
    });

    await writeAuditLog({
      action: 'REVIEW_CREATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: { reviewId: review.id, gameId, rating }
    });

    response.status(201).json({ review });
  })
);

// PATCH /api/reviews/:reviewId — owner or ADMIN can edit
router.patch(
  '/:reviewId',
  csrfProtect,
  validate(reviewIdParamsSchema, 'params'),
  validate(updateReviewSchema),
  asyncHandler(async (request, response) => {
    const { reviewId } = request.params as { reviewId: string };
    const { rating, comment } = request.body as { rating?: number; comment?: string };

    const existing = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing) throw new HttpError(404, 'Review not found.');

    const isOwner = existing.userId === request.user!.id;
    const isAdmin = request.user!.role === 'ADMIN';
    if (!isOwner && !isAdmin) throw new HttpError(403, 'No permission to edit this review.');

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(rating !== undefined && { rating }),
        ...(comment !== undefined && { comment })
      },
      include: {
        game: { select: { id: true, title: true } },
        user: { select: { id: true, fullName: true, email: true } }
      }
    });

    await writeAuditLog({
      action: 'REVIEW_UPDATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: { reviewId, rating, comment }
    });

    response.json({ review });
  })
);

// DELETE /api/reviews/:reviewId — owner or ADMIN can delete
router.delete(
  '/:reviewId',
  csrfProtect,
  validate(reviewIdParamsSchema, 'params'),
  asyncHandler(async (request, response) => {
    const { reviewId } = request.params as { reviewId: string };

    const existing = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing) throw new HttpError(404, 'Review not found.');

    const isOwner = existing.userId === request.user!.id;
    const isAdmin = request.user!.role === 'ADMIN';
    if (!isOwner && !isAdmin) throw new HttpError(403, 'No permission to delete this review.');

    await prisma.review.delete({ where: { id: reviewId } });

    await writeAuditLog({
      action: 'REVIEW_DELETED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: { reviewId, gameId: existing.gameId }
    });

    response.status(204).send();
  })
);

export { router as reviewRouter };
