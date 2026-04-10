import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { existsSync } from 'fs';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { assignRequestId } from './middleware/request-id';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  if (config.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(assignRequestId);

  app.use(
    helmet({
      // The API can also serve the compiled SPA in production, so CSP is defined centrally here.
      // A strict CSP reduces XSS impact by limiting where scripts and other resources may load from.
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", ...config.clientOrigins],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"]
        }
      },
      referrerPolicy: {
        policy: 'no-referrer'
      },
      frameguard: {
        action: 'deny'
      },
      noSniff: true,
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(
    '/api',
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (config.clientOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        logger.warn({ origin }, 'Blocked CORS origin');
        callback(new Error('Origin not allowed by CORS.'));
      }
    })
  );

  // Tight body limits reduce the blast radius of JSON-based abuse and accidental oversized payloads.
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(cookieParser(config.COOKIE_SIGNING_SECRET));

  app.use('/api', apiRouter);

  if (config.SERVE_CLIENT_BUILD) {
    const clientDistPath = path.resolve(__dirname, '../../client/dist');

    if (existsSync(clientDistPath)) {
      app.use(express.static(clientDistPath));
      app.get(/^(?!\/api).*/, (_request, response) => {
        response.sendFile(path.join(clientDistPath, 'index.html'));
      });
    }
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

