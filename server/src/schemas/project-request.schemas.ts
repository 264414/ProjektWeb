import { z } from 'zod';

export const createProjectRequestSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(20).max(1000),
  businessJustification: z.string().trim().min(20).max(1000),
  requestedBudget: z.coerce.number().int().min(100).max(1_000_000),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH'])
});

