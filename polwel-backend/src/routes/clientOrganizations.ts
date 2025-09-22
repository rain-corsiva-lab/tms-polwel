import express from 'express';
import { authenticateToken, authorizeRoles, authorizeOrganization, requirePermissions } from '../middleware/auth';
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
  getOrganizationLearners,
  resendCoordinatorSetup
} from '../controllers/clientOrganizationsController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Statistics and utilities routes
router.get('/stats', authorizeRoles('POLWEL'), getOrganizationStats);
router.get('/industries', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getIndustries);

// Client Organisations routes
router.get('/', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('clients.view'), getClientOrganizations);
router.get('/:id', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), authorizeOrganization, requirePermissions('clients.view'), getClientOrganizationById);
router.post('/', authorizeRoles('POLWEL'), requirePermissions('clients.create'), createClientOrganization);
router.put('/:id', authorizeRoles('POLWEL'), requirePermissions('clients.edit'), updateClientOrganization);
router.delete('/:id', authorizeRoles('POLWEL'), requirePermissions('clients.delete'), deleteClientOrganization);

// Training Coordinators routes
router.get('/:organizationId/coordinators', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), authorizeOrganization, requirePermissions('clients.view'), getOrganizationCoordinators);
router.post('/:organizationId/coordinators', authorizeRoles('POLWEL'), requirePermissions('clients.create'), createOrganizationCoordinator);
router.put('/:organizationId/coordinators/:coordinatorId', authorizeRoles('POLWEL'), requirePermissions('clients.edit'), updateOrganizationCoordinator);
router.delete('/:organizationId/coordinators/:coordinatorId', authorizeRoles('POLWEL'), requirePermissions('clients.delete'), deleteOrganizationCoordinator);
router.post('/:organizationId/coordinators/:coordinatorId/resend-setup', authorizeRoles('POLWEL'), resendCoordinatorSetup);

// Learners routes
router.get('/:organizationId/learners', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), authorizeOrganization, requirePermissions('clients.view'), getOrganizationLearners);

export default router;
