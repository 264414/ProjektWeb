import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { csrfProtect } from '../middleware/csrf-protect';
import { validate } from '../middleware/validate';
import { createProjectRequestSchema } from '../schemas/project-request.schemas';
import { buildProjectRequestScope } from '../services/access.service';
import { writeAuditLog } from '../lib/audit';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (request, response) => {
    // RBAC is enforced on the server by scoping the query itself, not only by hiding UI elements.
    const requests = await prisma.projectRequest.findMany({
      where: buildProjectRequestScope(request.user!),
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
  validate(createProjectRequestSchema),
  asyncHandler(async (request, response) => {
    const payload = request.body as {
      title: string;
      description: string;
      businessJustification: string;
      requestedBudget: number;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };

    const created = await prisma.projectRequest.create({
      data: {
        ...payload,
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
      action: 'PROJECT_REQUEST_CREATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: {
        projectRequestId: created.id,
        riskLevel: created.riskLevel
      }
    });

    response.status(201).json({
      item: created
    });
  })
);

export { router as projectRequestRouter };

