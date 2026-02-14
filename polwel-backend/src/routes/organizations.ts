import express from 'express';
import { organizationsController } from '../controllers/organizationsController';

const router = express.Router();

// Get all organizations (with optional type filter)
router.get('/', organizationsController.getOrganizations);

// Get all enrollments for an organization
router.get('/:id/enrollments', organizationsController.getOrganizationEnrollments);

// Get single organization by ID
router.get('/:id', organizationsController.getOrganizationById);

export default router;
