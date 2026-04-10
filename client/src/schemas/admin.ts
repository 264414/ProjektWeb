import { z } from 'zod';

export const adminUserUpdateFormSchema = z.object({
  userId: z.string().min(1, 'Wybierz użytkownika.'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER'])
});

export type AdminUserUpdateFormValues = z.infer<typeof adminUserUpdateFormSchema>;
