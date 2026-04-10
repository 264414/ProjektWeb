import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { HttpError } from '../lib/http-error';

type ValidationSource = 'body' | 'params' | 'query';

export function validate(schema: ZodTypeAny, source: ValidationSource = 'body') {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request[source]);

    if (!result.success) {
      console.error(`Validation failed for ${source}:`, JSON.stringify(result.error.flatten(), null, 2), '\nPayload was:', request[source]);
      next(new HttpError(400, 'Validation failed.', result.error.flatten()));
      return;
    }

    request[source] = result.data;
    next();
  };
}
