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
  getTrainerCourseRuns
} from '../controllers/trainersController';

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

export default router;
