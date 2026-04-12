import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error';
import { hashToken } from '../lib/session';
import { prisma } from '../lib/prisma';
import { getClearSessionCookieOptions, SESSION_COOKIE_NAME } from '../lib/cookies';

// Authentication middleware: validates session cookie against database record.
// Uses httpOnly session cookies — no tokens exposed to client JS (mitigates XSS token theft).
// On failure clears the stale cookie to prevent repeated unnecessary lookups.
export async function authenticate(request: Request, response: Response, next: NextFunction): Promise<void> {
  const rawToken = request.cookies[SESSION_COOKIE_NAME];

  if (!rawToken || typeof rawToken !== 'string') {
    next(new HttpError(401, 'Authentication required.'));
    return;
  }

  // Token is hashed before DB lookup — raw token never stored in database
  const session = await prisma.session.findUnique({
    where: {
      sessionTokenHash: hashToken(rawToken)
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true
        }
      }
    }
  });

  if (!session) {
    response.clearCookie(SESSION_COOKIE_NAME, getClearSessionCookieOptions(request));
    next(new HttpError(401, 'Authentication required.'));
    return;
  }

  // Check session expiry — expired sessions are deleted from DB and cookie cleared
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({
      where: {
        id: session.id
      }
    });

    response.clearCookie(SESSION_COOKIE_NAME, getClearSessionCookieOptions(request));
    next(new HttpError(401, 'Session expired.'));
    return;
  }

  request.session = {
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt
  };
  request.user = session.user;

  next();
}
