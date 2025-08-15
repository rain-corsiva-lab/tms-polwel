import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import {
  getClientOrganizations,
  getClientOrganizationById,
  createClientOrganization,
  updateClientOrganization,
  deleteClientOrganization,
  getOrganizationStats,
  getIndustries,
  getOrganizationCoordinators,
  createOrganizationCoordinator,
  updateOrganizationCoordinator,
  deleteOrganizationCoordinator,
  getOrganizationLearners
} from '../controllers/clientOrganizationsController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Statistics and utilities routes
router.get('/stats', authorizeRoles('POLWEL'), getOrganizationStats);
router.get('/industries', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getIndustries);

// Client Organizations routes
router.get('/', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getClientOrganizations);
router.get('/:id', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getClientOrganizationById);
router.post('/', authorizeRoles('POLWEL'), createClientOrganization);
router.put('/:id', authorizeRoles('POLWEL'), updateClientOrganization);
router.delete('/:id', authorizeRoles('POLWEL'), deleteClientOrganization);

// Training Coordinators routes
router.get('/:organizationId/coordinators', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getOrganizationCoordinators);
router.post('/:organizationId/coordinators', authorizeRoles('POLWEL'), createOrganizationCoordinator);
router.put('/:organizationId/coordinators/:coordinatorId', authorizeRoles('POLWEL'), updateOrganizationCoordinator);
router.delete('/:organizationId/coordinators/:coordinatorId', authorizeRoles('POLWEL'), deleteOrganizationCoordinator);

// Learners routes
router.get('/:organizationId/learners', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getOrganizationLearners);

export default router;
