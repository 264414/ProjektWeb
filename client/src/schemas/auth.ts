import { z } from 'zod';

const emailSchema = z.string().trim().email('Podaj poprawny adres e-mail.').max(254);

const passwordSchema = z
  .string()
  .min(12, 'Haslo musi miec co najmniej 12 znakow.')
  .max(128, 'Haslo jest zbyt dlugie.')
  .regex(/[A-Z]/, 'Haslo musi zawierac wielka litere.')
  .regex(/[a-z]/, 'Haslo musi zawierac mala litere.')
  .regex(/[0-9]/, 'Haslo musi zawierac cyfre.')
  .regex(/[^A-Za-z0-9]/, 'Haslo musi zawierac znak specjalny.');

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Haslo jest wymagane.'),
  recaptchaToken: z.string().optional()
});

export const registerFormSchema = z
  .object({
    fullName: z.string().trim().min(3, 'Podaj imie i nazwisko.').max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Powtorz haslo.')
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Hasla musza byc identyczne.'
      });
    }
  });

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Podaj aktualne haslo.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Powtorz nowe haslo.')
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Hasla musza byc identyczne.'
      });
    }

    if (value.currentPassword === value.newPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'Nowe haslo musi byc inne niz aktualne.'
      });
    }
  });

export const forgotPasswordRequestFormSchema = z.object({
  email: emailSchema
});

export const forgotPasswordConfirmFormSchema = z
  .object({
    email: emailSchema,
    code: z.string().regex(/^\d{6}$/, 'Podaj 6-cyfrowy kod.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Powtorz nowe haslo.')
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Hasla musza byc identyczne.'
      });
    }
  });

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
export type ForgotPasswordRequestFormValues = z.infer<typeof forgotPasswordRequestFormSchema>;
export type ForgotPasswordConfirmFormValues = z.infer<typeof forgotPasswordConfirmFormSchema>;

