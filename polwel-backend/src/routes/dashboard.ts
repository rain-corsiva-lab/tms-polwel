import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  getGlobalDashboardMetrics,
  getDashboardActionItems,
  getUpcomingCourseRuns,
  getCompletedRunsYTD,
  getCompletedRunTypesByMonth,
  getCompletedCoursesByCategory,
  getCourseCompletionRateByMonth,
  getOpenRunCancellationRates,
  getDraftCourseRuns,
} from '../controllers/dashboardController';

const router = express.Router();

router.use(authenticateToken);

// GET /api/dashboard/metrics
router.get('/metrics', getGlobalDashboardMetrics);

// GET /api/dashboard/action-items
router.get('/action-items', getDashboardActionItems);

// GET /api/dashboard/upcoming-runs
router.get('/upcoming-runs', getUpcomingCourseRuns);

// GET /api/dashboard/completed-runs-ytd
router.get('/completed-runs-ytd', getCompletedRunsYTD);

// GET /api/dashboard/completed-run-types
router.get('/completed-run-types', getCompletedRunTypesByMonth);

// GET /api/dashboard/completed-by-category
router.get('/completed-by-category', getCompletedCoursesByCategory);

// GET /api/dashboard/completion-rate
router.get('/completion-rate', getCourseCompletionRateByMonth);

// GET /api/dashboard/cancellation-rates
router.get('/cancellation-rates', getOpenRunCancellationRates);

// GET /api/dashboard/draft-runs
router.get('/draft-runs', getDraftCourseRuns);

export default router;
