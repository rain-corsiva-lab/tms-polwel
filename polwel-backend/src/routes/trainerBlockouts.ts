import express from 'express';
import { trainerBlockoutController } from '../controllers/trainerBlockoutController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Trainer blockout routes
router.get('/trainer/:trainerId/blockouts', trainerBlockoutController.getTrainerBlockouts);
router.get('/trainer/:trainerId/calendar', trainerBlockoutController.getCalendarView);
router.post('/blockouts', trainerBlockoutController.createBlockout);
router.get('/blockouts/:id', trainerBlockoutController.getBlockoutById);
router.put('/blockouts/:id', trainerBlockoutController.updateBlockout);
router.delete('/blockouts/:id', trainerBlockoutController.deleteBlockout);

export default router;
