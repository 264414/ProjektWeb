import type { CookieOptions } from 'express';
import { config } from '../config/env';

export const SESSION_COOKIE_NAME = 'sid';
export const CSRF_COOKIE_NAME = 'csrf_token';

function buildBaseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.COOKIE_SECURE,
    domain: config.COOKIE_DOMAIN || undefined,
    path: '/'
  };
}

export function getSessionCookieOptions(): CookieOptions {
  return {
    ...buildBaseCookieOptions(),
    maxAge: config.SESSION_TTL_HOURS * 60 * 60 * 1000
  };
}

export function getClearSessionCookieOptions(): CookieOptions {
  return {
    ...buildBaseCookieOptions(),
    maxAge: 0
  };
}

export function getCsrfCookieOptions(): CookieOptions {
  return {
    ...buildBaseCookieOptions(),
    signed: true,
    maxAge: 8 * 60 * 60 * 1000
  };
}

export function getClearCsrfCookieOptions(): CookieOptions {
  return {
    ...buildBaseCookieOptions(),
    signed: true,
    maxAge: 0
  };
}
