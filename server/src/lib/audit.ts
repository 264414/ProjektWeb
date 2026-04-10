import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { logger } from '../config/logger';
import { prisma } from './prisma';

// Pattern for detecting sensitive keys — matched values are stripped from audit details
// Prevents accidental logging of passwords, tokens, or cookies (OWASP A09: Security Logging Failures)
const SENSITIVE_KEY_PATTERN = /(password|token|secret|cookie|authorization)/i;

function sanitizeAuditValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.slice(0, 300);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((entry) => sanitizeAuditValue(entry))
      .filter((entry): entry is Prisma.InputJsonValue => entry !== undefined);
  }

  if (typeof value === 'object') {
    const sanitizedEntries = Object.entries(value).flatMap(([key, entryValue]) => {
      // Strip keys matching sensitive patterns before persisting
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        return [];
      }

      const sanitizedValue = sanitizeAuditValue(entryValue);

      if (sanitizedValue === undefined) {
        return [];
      }

      return [[key, sanitizedValue] as const];
    });

    return Object.fromEntries(sanitizedEntries) as Prisma.InputJsonObject;
  }

  return String(value);
}

// action is typed as string (not an enum) so new audit events can be added
// without requiring a database schema migration
export async function writeAuditLog(params: {
  action: string;
  success: boolean;
  request: Request;
  actorUserId?: string;
  targetUserId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const sanitizedDetails = params.details ? sanitizeAuditValue(params.details) : undefined;

  logger.info(
    {
      requestId: params.request.id,
      action: params.action,
      success: params.success,
      actorUserId: params.actorUserId,
      targetUserId: params.targetUserId,
      ipAddress: params.request.ip,
      details: sanitizedDetails
    },
    'Audit event'
  );

  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        success: params.success,
        actorUserId: params.actorUserId,
        targetUserId: params.targetUserId,
        ipAddress: params.request.ip,
        userAgent: params.request.get('user-agent')?.slice(0, 255),
        requestId: params.request.id,
        details: sanitizedDetails
      }
    });
  } catch (error) {
    // Audit log failure must never break the main request flow
    logger.warn(
      {
        requestId: params.request.id,
        action: params.action,
        error
      },
      'Failed to persist audit log'
    );
  }
}
