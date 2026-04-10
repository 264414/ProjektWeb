import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';

const router = Router();

// Public FAQ endpoint used by landing page.
router.get(
  '/',
  asyncHandler(async (_request, response) => {
    const faqItems = await prisma.faq.findMany({
      select: {
        id: true,
        question: true,
        answer: true,
        createdAt: true
      },
      orderBy: { id: 'asc' }
    });

    response.json({ faqItems });
  })
);

export { router as faqRouter };
