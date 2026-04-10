import { Router } from 'express';
import { authRouter } from './auth.routes';
import { dashboardRouter } from './dashboard.routes';
import { gameRouter } from './game.routes';
import { orderRouter } from './order.routes';
import { reviewRouter } from './review.routes';
import { adminRouter } from './admin.routes';
import { faqRouter } from './faq.routes';
import { promotionRouter } from './promotion.routes';

const router = Router();

router.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

router.use('/auth', authRouter);
router.use('/dashboard', dashboardRouter);
router.use('/games', gameRouter);
router.use('/orders', orderRouter);
router.use('/reviews', reviewRouter);
router.use('/admin', adminRouter);
router.use('/faq', faqRouter);
router.use('/promotions', promotionRouter);

export { router as apiRouter };
