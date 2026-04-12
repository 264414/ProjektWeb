import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL connection string.'
    ),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173'),
  COOKIE_SIGNING_SECRET: z.string().min(32),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  COOKIE_DOMAIN: z.string().default(''),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  SERVE_CLIENT_BUILD: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  RECAPTCHA_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  RECAPTCHA_PROJECT_ID: z.string().optional(),
  RECAPTCHA_SITE_KEY: z.string().optional(),
  RECAPTCHA_LOGIN_ACTION: z.string().default('login'),
  RECAPTCHA_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.5),
  RECAPTCHA_ENFORCE_HOST: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional()
});

const parsedEnvironment = envSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const flattened = parsedEnvironment.error.flatten().fieldErrors;
  throw new Error(`Invalid environment configuration: ${JSON.stringify(flattened, null, 2)}`);
}

const environment = parsedEnvironment.data;

export const config = {
  ...environment,
  isProduction: environment.NODE_ENV === 'production',
  clientOrigins: environment.CLIENT_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
};

