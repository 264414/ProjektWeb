import { z } from 'zod';

export const projectRequestFormSchema = z.object({
  title: z.string().trim().min(3, 'Podaj tytul wniosku.').max(120),
  description: z.string().trim().min(20, 'Opis musi miec co najmniej 20 znakow.').max(1000),
  businessJustification: z
    .string()
    .trim()
    .min(20, 'Uzasadnienie biznesowe musi miec co najmniej 20 znakow.')
    .max(1000),
  requestedBudget: z.coerce.number().int().min(100, 'Minimalny budzet to 100 PLN.').max(1_000_000),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH'])
});

export type ProjectRequestFormValues = z.infer<typeof projectRequestFormSchema>;

