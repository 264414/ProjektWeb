import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { csrfProtect } from '../middleware/csrf-protect';
import { validate } from '../middleware/validate';
import { createLeaveRequestSchema } from '../schemas/leave-request.schemas';
import { buildLeaveRequestScope } from '../services/access.service';
import { writeAuditLog } from '../lib/audit';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (request, response) => {
    const requests = await prisma.leaveRequest.findMany({
      where: buildLeaveRequestScope(request.user!),
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    response.json({ items: requests });
  })
);

router.post(
  '/',
  authenticate,
  csrfProtect,
  validate(createLeaveRequestSchema),
  asyncHandler(async (request, response) => {
    const payload = request.body as {
      startDate: Date;
      endDate: Date;
      reason: string;
    };

    const created = await prisma.leaveRequest.create({
      data: {
        startDate: payload.startDate,
        endDate: payload.endDate,
        reason: payload.reason,
        userId: request.user!.id
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    await writeAuditLog({
      action: 'LEAVE_REQUEST_CREATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: {
        leaveRequestId: created.id,
        startDate: created.startDate,
        endDate: created.endDate
      }
    });

    response.status(201).json({
      item: created
    });
  })
);

export { router as leaveRequestRouter };

