import { z } from 'zod';

export const createReviewSchema = z.object({
  gameId: z.string().min(1, 'Invalid game ID.'),
  rating: z
    .number()
    .int('Rating must be a whole number.')
    .min(1, 'Rating must be at least 1.')
    .max(5, 'Rating cannot exceed 5.'),
  comment: z
    .string()
    .min(10, 'Comment must be at least 10 characters.')
    .max(500, 'Comment cannot exceed 500 characters.')
});

export const updateReviewSchema = z.object({
  rating: z
    .number()
    .int('Rating must be a whole number.')
    .min(1, 'Rating must be at least 1.')
    .max(5, 'Rating cannot exceed 5.')
    .optional(),
  comment: z
    .string()
    .min(10, 'Comment must be at least 10 characters.')
    .max(500, 'Comment cannot exceed 500 characters.')
    .optional()
}).refine((data) => data.rating !== undefined || data.comment !== undefined, {
  message: 'At least one field (rating or comment) must be provided.'
});

export const reviewIdParamsSchema = z.object({
  reviewId: z.string().min(1, 'Invalid review ID format.')
});

