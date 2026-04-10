import crypto from 'crypto';
import type { Request } from 'express';
import { prisma } from './prisma';
import { config } from '../config/env';

function truncate(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.slice(0, maxLength);
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function createSession(userId: string, request: Request): Promise<{ token: string; expiresAt: Date }> {
  // The browser receives only a random opaque identifier. The database stores a hash,
  // so a database leak does not immediately expose live session cookies.
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      sessionTokenHash: hashToken(rawToken),
      expiresAt,
      ipAddress: truncate(request.ip, 100),
      userAgent: truncate(request.get('user-agent') ?? undefined, 255)
    }
  });

  return {
    token: rawToken,
    expiresAt
  };
}

export async function invalidateSession(rawToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      sessionTokenHash: hashToken(rawToken)
    }
  });
}

