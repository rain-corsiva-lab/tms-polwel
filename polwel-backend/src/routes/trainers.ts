import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import {
  getTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getTrainerBlockouts,
  createTrainerBlockout,
  deleteTrainerBlockout,
  getPartnerOrganizations,
  getTrainerCourseRuns,
  resendTrainerSetup
} from '../controllers/trainersController';
import { 
  listTrainerFees,
  createTrainerFee,
  updateTrainerFee,
  deleteTrainerFee
} from '../controllers/trainerFeesController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Routes accessible by POLWEL and TRAINING_COORDINATOR
router.get('/', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getTrainers);
router.get('/partner-organizations', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getPartnerOrganizations);
router.get('/:id', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getTrainerById);

// Routes accessible only by POLWEL
router.post('/', authorizeRoles('POLWEL'), createTrainer);
router.put('/:id', authorizeRoles('POLWEL'), updateTrainer);
router.delete('/:id', authorizeRoles('POLWEL'), deleteTrainer);

// Trainer blockout routes
router.get('/:id/blockouts', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getTrainerBlockouts);
router.post('/:id/blockouts', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), createTrainerBlockout);
router.delete('/:id/blockouts/:blockoutId', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), deleteTrainerBlockout);

// Trainer course runs
router.get('/:id/course-runs', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getTrainerCourseRuns);

// Trainer onboarding
router.post('/:id/resend-setup', authorizeRoles('POLWEL'), resendTrainerSetup);

// Trainer fees (POLWEL + TRAINING_COORDINATOR read, POLWEL manage)
router.get('/:id/fees', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), listTrainerFees);
router.post('/:id/fees', authorizeRoles('POLWEL'), createTrainerFee);
router.put('/:id/fees/:feeId', authorizeRoles('POLWEL'), updateTrainerFee);
router.delete('/:id/fees/:feeId', authorizeRoles('POLWEL'), deleteTrainerFee);

export default router;
