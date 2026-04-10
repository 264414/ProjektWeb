import { z } from 'zod';

export const reviewFormSchema = z.object({
  gameId: z.string().min(1, 'Wybierz grę.'),
  rating: z
    .number({ invalid_type_error: 'Podaj ocenę.' })
    .int('Ocena musi być liczbą całkowitą.')
    .min(1, 'Minimalna ocena to 1.')
    .max(5, 'Maksymalna ocena to 5.'),
  comment: z
    .string()
    .min(10, 'Komentarz musi mieć co najmniej 10 znaków.')
    .max(500, 'Komentarz nie może przekraczać 500 znaków.')
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
