import express from 'express';
import { referencesController } from '../controllers/referencesController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Reference data routes
router.get('/trainers', referencesController.getTrainers);
router.get('/partners', referencesController.getPartners);
router.get('/venues', referencesController.getVenues);
router.get('/categories', referencesController.getCategories);

export default router;
