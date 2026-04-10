import { z } from 'zod';

export const leaveRequestFormSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Wybierz date poczatkowa.'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Wybierz date koncowa.'),
    reason: z.string().trim().min(10, 'Powod musi miec co najmniej 10 znakow.').max(500)
  })
  .superRefine((value, context) => {
    if (value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'Data koncowa nie moze byc wczesniejsza niz poczatkowa.'
      });
    }
  });

export type LeaveRequestFormValues = z.infer<typeof leaveRequestFormSchema>;

