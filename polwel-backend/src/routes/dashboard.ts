import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { getGlobalDashboardMetrics } from '../controllers/dashboardController';

const router = express.Router();

router.use(authenticateToken);

// GET /api/dashboard/metrics
router.get('/metrics', getGlobalDashboardMetrics);

export default router;
