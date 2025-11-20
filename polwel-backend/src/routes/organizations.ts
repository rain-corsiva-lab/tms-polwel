import express from 'express';
import { organizationsController } from '../controllers/organizationsController';

const router = express.Router();

// Get all organizations (with optional type filter)
router.get('/', organizationsController.getOrganizations);

// Get single organization by ID
router.get('/:id', organizationsController.getOrganizationById);

export default router;
