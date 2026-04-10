import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error';
import { writeAuditLog } from '../lib/audit';

export function requireRole(allowedRoles: Role[]) {
  return async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    if (!request.user) {
      next(new HttpError(401, 'Authentication required.'));
      return;
    }

    if (allowedRoles.includes(request.user.role)) {
      next();
      return;
    }

    await writeAuditLog({
      action: 'AUTHZ_DENIED',
      success: false,
      request,
      actorUserId: request.user.id,
      details: {
        path: request.originalUrl,
        requiredRoles: allowedRoles,
        actualRole: request.user.role
      }
    });

    next(new HttpError(403, 'Insufficient permissions.'));
  };
}

