import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as reportingController from '../controllers/reportingController';

const router = Router();

// All reporting routes require authentication
router.use(authenticateToken);

// Board Report
router.get('/board-report', reportingController.getBoardReport);
router.get('/board-report-all', reportingController.getBoardReportAll);
router.get('/quarter-details', reportingController.getQuarterDetails);

// Runs by Organisation
router.get('/runs-by-organisation', reportingController.getRunsByOrganisation);

// Runs by Trainer
router.get('/runs-by-trainer', reportingController.getRunsByTrainer);

// Runs by Status
router.get('/runs-by-status', reportingController.getRunsByStatus);

// Runs by Period
router.get('/runs-by-period', reportingController.getRunsByPeriod);

// Runs by Venue
router.get('/runs-by-venue', reportingController.getRunsByVenue);

// Run Details (for popup)
router.get('/run-details/:id', reportingController.getRunDetails);

// Filter options
router.get('/filter-options', reportingController.getFilterOptions);

export default router;
