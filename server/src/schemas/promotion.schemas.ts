import { z } from 'zod';

export const createPromotionSchema = z.object({
  name: z.string().min(3).max(120),
  minDistinctGames: z.number().int().min(2).max(10),
  discountPercent: z.number().min(1).max(90),
  isActive: z.boolean().optional().default(true)
});

export const updatePromotionSchema = createPromotionSchema.partial();

export const promotionIdParamsSchema = z.object({
  promotionId: z.string().cuid('Invalid promotion ID format.')
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
