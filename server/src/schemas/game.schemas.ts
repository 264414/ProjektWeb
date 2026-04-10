import { z } from 'zod';

const GENRE_VALUES = ['ACTION', 'RPG', 'STRATEGY', 'SPORTS', 'HORROR', 'ADVENTURE', 'PUZZLE', 'SIMULATION'] as const;

export const createGameSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(1000),
  // Price validated as non-negative float; stored as Float in DB
  price: z.number().min(0, 'Price cannot be negative.').max(999.99, 'Price cannot exceed 999.99.'),
  genre: z.enum(GENRE_VALUES),
  publisher: z.string().min(2).max(100),
  releaseYear: z
    .number()
    .int()
    .min(1970, 'Release year must be 1970 or later.')
    .max(new Date().getFullYear() + 2, 'Release year too far in the future.'),
  stock: z.number().int().min(0).max(99999).optional().default(100)
});

export const updateGameSchema = createGameSchema.partial().extend({
  isActive: z.boolean().optional()
});

export const gameIdParamsSchema = z.object({
  gameId: z.string().cuid('Invalid game ID format.')
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
