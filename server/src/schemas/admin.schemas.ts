import { z } from 'zod';

export const updateUserParamsSchema = z.object({
  userId: z.string().cuid()
});

export const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'USER'])
});

export const createAdminUserSchema = z.object({
  fullName: z.string().min(2, 'Min. 2 znaki.').max(100),
  email: z.string().email('Nieprawidłowy adres e-mail.'),
  password: z.string().min(8, 'Min. 8 znaków.'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER'])
});

export const smtpConfigSchema = z.object({
  host: z.string().trim().min(1, 'Host SMTP jest wymagany.'),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().trim().min(1, 'Użytkownik SMTP jest wymagany.'),
  pass: z.string().optional(),
  from: z.string().trim().email('Nieprawidłowy adres e-mail nadawcy.')
});

export const smtpTestSchema = z.object({
  to: z.string().trim().email('Nieprawidłowy adres e-mail odbiorcy.')
});
