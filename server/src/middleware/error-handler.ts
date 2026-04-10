import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { HttpError } from '../lib/http-error';

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: error.message,
      requestId: request.id,
      details: error.statusCode < 500 ? error.details : undefined
    });
    return;
  }

  logger.error(
    {
      requestId: request.id,
      method: request.method,
      path: request.originalUrl,
      error
    },
    'Unhandled application error'
  );

  response.status(500).json({
    error: 'Internal server error.',
    requestId: request.id
  });
}

