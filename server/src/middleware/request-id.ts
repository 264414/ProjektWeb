import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export function assignRequestId(request: Request, response: Response, next: NextFunction): void {
  request.id = randomUUID();
  response.setHeader('X-Request-Id', request.id);
  next();
}

