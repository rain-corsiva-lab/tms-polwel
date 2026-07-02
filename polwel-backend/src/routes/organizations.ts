import express from 'express';
import { organizationsController } from '../controllers/organizationsController';

const router = express.Router();

// Get all organizations (with optional type filter)
router.get('/', organizationsController.getOrganizations);

// Scan and find duplicate organizations
router.get('/duplicates', organizationsController.getDuplicates);

// Merge duplicate organizations
router.post('/merge-duplicates', organizationsController.mergeDuplicates);

// Get all enrollments for an organization
router.get('/:id/enrollments', organizationsController.getOrganizationEnrollments);

// Get single organization by ID
router.get('/:id', organizationsController.getOrganizationById);

export default router;
