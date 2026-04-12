import type { CookieOptions, Request } from 'express';
import { config } from '../config/env';

export const SESSION_COOKIE_NAME = 'sid';
export const CSRF_COOKIE_NAME = 'csrf_token';

function shouldUseSecureCookies(request: Request): boolean {
  if (!config.COOKIE_SECURE) {
    return false;
  }

  return request.secure;
}

function buildBaseCookieOptions(request: Request): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: shouldUseSecureCookies(request),
    domain: config.COOKIE_DOMAIN || undefined,
    path: '/'
  };
}

export function getSessionCookieOptions(request: Request): CookieOptions {
  return {
    ...buildBaseCookieOptions(request),
    maxAge: config.SESSION_TTL_HOURS * 60 * 60 * 1000
  };
}

export function getClearSessionCookieOptions(request: Request): CookieOptions {
  return {
    ...buildBaseCookieOptions(request),
    maxAge: 0
  };
}

export function getCsrfCookieOptions(request: Request): CookieOptions {
  return {
    ...buildBaseCookieOptions(request),
    signed: true,
    maxAge: 8 * 60 * 60 * 1000
  };
}

export function getClearCsrfCookieOptions(request: Request): CookieOptions {
  return {
    ...buildBaseCookieOptions(request),
    signed: true,
    maxAge: 0
  };
}
