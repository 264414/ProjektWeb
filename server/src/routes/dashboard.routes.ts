import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { getDashboardData } from '../services/dashboard.service';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (request, response) => {
    const dashboard = await getDashboardData(request.user!);
    response.json(dashboard);
  })
);

export { router as dashboardRouter };

