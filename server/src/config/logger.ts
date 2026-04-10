import pino from 'pino';
import { config } from './env';

export const logger = pino({
  level: config.LOG_LEVEL,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    // Redaction ensures accidental request/body logging does not expose secrets.
    // This reduces the impact of log leakage after auth or incident handling.
    paths: [
      'password',
      'passwordHash',
      'currentPassword',
      'newPassword',
      'confirmPassword',
      '*.password',
      '*.passwordHash',
      '*.currentPassword',
      '*.newPassword',
      '*.confirmPassword',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-csrf-token"]'
    ],
    censor: '[Redacted]'
  },
  formatters: {
    level: (label) => ({ level: label })
  }
});

