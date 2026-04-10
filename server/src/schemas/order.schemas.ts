import { z } from 'zod';

const orderItemSchema = z.object({
  gameId: z.string().min(1, 'Invalid game ID.'),
  quantity: z
    .number()
    .int('Quantity must be a whole number.')
    .min(1, 'Minimum 1 copy per order.')
    .max(10, 'Maximum 10 copies per order.')
});

export const createOrderSchema = z.object({
  gameId: z.string().min(1, 'Invalid game ID.').optional(),
  quantity: z
    .number()
    .int('Quantity must be a whole number.')
    .min(1, 'Minimum 1 copy per order.')
    .max(10, 'Maximum 10 copies per order.')
    .optional(),
  items: z.array(orderItemSchema).min(1, 'Add at least one game item.').max(20, 'Too many game items.').optional(),
  address: z.string().min(5, 'Adres jest za krótki.').max(200, 'Adres jest za długi.'),
  phone: z.string().regex(/^[0-9+ \-]{9,15}$/, 'Nieprawidłowy numer telefonu.')
}).superRefine((data, ctx) => {
  const hasItemsArray = Boolean(data.items && data.items.length > 0);
  const hasSingleItem = Boolean(data.gameId && data.quantity);

  if (!hasItemsArray && !hasSingleItem) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either items[] or gameId with quantity.',
      path: ['items']
    });
  }
});

export const orderIdParamsSchema = z.object({
  orderId: z.string().min(1, 'Invalid order ID format.')
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'SHIPPED', 'COMPLETED', 'CANCELLED'])
});
