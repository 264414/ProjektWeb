import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error';
import { CSRF_COOKIE_NAME, getClearCsrfCookieOptions, getCsrfCookieOptions } from '../lib/cookies';

export function issueCsrfToken(request: Request, response: Response): string {
  const token = crypto.randomBytes(32).toString('base64url');

  // Signed cookies detect tampering while the mirrored header blocks cross-site form posts.
  response.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions(request));

  return token;
}

export function clearCsrfCookie(request: Request, response: Response): void {
  response.clearCookie(CSRF_COOKIE_NAME, getClearCsrfCookieOptions(request));
}

export function csrfProtect(request: Request, _response: Response, next: NextFunction): void {
  const cookieToken = request.signedCookies[CSRF_COOKIE_NAME];
  const headerToken = request.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(new HttpError(403, 'Invalid CSRF token.'));
    return;
  }

  next();
}
