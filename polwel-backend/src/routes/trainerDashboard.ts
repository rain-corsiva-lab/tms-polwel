import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import {
  getTrainerDashboard,
  updateTrainerProfile
} from '../controllers/trainerDashboardController';

const router = express.Router();

// Protect all trainer dashboard routes
router.use(authenticateToken);

// Trainer dashboard routes - temporarily open to all authenticated users
router.get('/dashboard', getTrainerDashboard);
router.put('/profile', updateTrainerProfile);

export default router;
