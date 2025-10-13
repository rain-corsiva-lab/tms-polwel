import express from 'express';
import { authenticateToken, authorizeRoles, requirePermissions } from '../middleware/auth';
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
  getTrainerTrainingSummary,
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
router.get('/', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('trainers.view'), getTrainers);
router.get('/partner-organizations', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('trainers.view'), getPartnerOrganizations);
router.get('/:id', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('trainers.view'), getTrainerById);

// Routes accessible only by POLWEL
router.post('/', authorizeRoles('POLWEL'), requirePermissions('trainers.create'), createTrainer);
router.put('/:id', authorizeRoles('POLWEL'), requirePermissions('trainers.edit'), updateTrainer);
router.delete('/:id', authorizeRoles('POLWEL'), requirePermissions('trainers.delete'), deleteTrainer);

// Trainer blockout routes
router.get('/:id/blockouts', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('trainers.view'), getTrainerBlockouts);
router.post('/:id/blockouts', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('trainers.edit'), createTrainerBlockout);
router.delete('/:id/blockouts/:blockoutId', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('trainers.edit'), deleteTrainerBlockout);

// Trainer course runs
router.get('/:id/course-runs', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('course-run.view'), getTrainerCourseRuns);
router.get('/:id/training-summary', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('course-run.view'), getTrainerTrainingSummary);

// Trainer onboarding
router.post('/:id/resend-setup', authorizeRoles('POLWEL'), requirePermissions('trainers.edit'), resendTrainerSetup);

// Trainer fees (POLWEL + TRAINING_COORDINATOR read, POLWEL manage)
router.get('/:id/fees', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('trainers.view'), listTrainerFees);
router.post('/:id/fees', authorizeRoles('POLWEL'), requirePermissions('trainers.edit'), createTrainerFee);
router.put('/:id/fees/:feeId', authorizeRoles('POLWEL'), requirePermissions('trainers.edit'), updateTrainerFee);
router.delete('/:id/fees/:feeId', authorizeRoles('POLWEL'), requirePermissions('trainers.edit'), deleteTrainerFee);

export default router;
