import { z } from 'zod';

function parseDateOnlyToUtc(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format.')
  .transform(parseDateOnlyToUtc);

export const createLeaveRequestSchema = z
  .object({
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    reason: z.string().trim().min(10).max(500)
  })
  .superRefine((value, context) => {
    if (value.endDate.getTime() < value.startDate.getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must not be earlier than start date.',
        path: ['endDate']
      });
    }
  });

