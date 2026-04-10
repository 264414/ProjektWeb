import { z } from 'zod';

export const orderFormSchema = z.object({
  gameId: z.string().min(1, 'Wybierz grę.'),
  quantity: z
    .number({ invalid_type_error: 'Podaj liczbę.' })
    .int('Ilość musi być liczbą całkowitą.')
    .min(1, 'Minimalna ilość to 1.')
    .max(10, 'Maksymalna ilość to 10.')
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
