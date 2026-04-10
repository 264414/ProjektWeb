import type { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { createSession } from '../lib/session';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '../lib/cookies';
import { prisma } from '../lib/prisma';

export function maskEmail(email: string): string {
  const [localPart, domain = 'unknown'] = email.split('@');
  const visiblePrefix = localPart.slice(0, 2);
  return `${visiblePrefix}${'*'.repeat(Math.max(localPart.length - 2, 1))}@${domain}`;
}

export function serializeUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role
  };
}

// Attaches session cookie to response — httpOnly, SameSite=Strict, Secure in production
// Raw token is NOT stored; only its SHA-256 hash is persisted in the sessions table
export async function attachSessionCookie(response: Response, request: Request, userId: string): Promise<void> {
  const session = await createSession(userId, request);
  response.cookie(SESSION_COOKIE_NAME, session.token, getSessionCookieOptions());
}

export async function getUserForClient(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true
    }
  });
}
