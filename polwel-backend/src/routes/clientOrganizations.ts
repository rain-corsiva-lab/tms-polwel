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
  getAllLearners,
  getOrganizationLearners,
  resendCoordinatorSetup,
  getCoordinatorCourseRunsSelf,
  getOrganizationLearnersSelf,
  getBuNumbers,
  createBuNumber,
  updateBuNumber,
  deleteBuNumber,
} from '../controllers/clientOrganizationsController';
import {
  getCoursesByLearnersRanking,
  getDivisionsByLearnersRanking,
  getCoordinatorResources,
} from '../controllers/organizationAnalyticsController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// BU Number options (dynamic list)
router.get('/bu-numbers', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getBuNumbers);
router.post('/bu-numbers', authorizeRoles('POLWEL'), requirePermissions('clients.create'), createBuNumber);
router.put('/bu-numbers/:value', authorizeRoles('POLWEL'), requirePermissions('clients.edit'), updateBuNumber);
router.delete('/bu-numbers/:value', authorizeRoles('POLWEL'), requirePermissions('clients.delete'), deleteBuNumber);

// Statistics and utilities routes
router.get('/stats', authorizeRoles('POLWEL'), getOrganizationStats);
router.get('/industries', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), getIndustries);

// Client Organisations routes
router.get('/', authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), requirePermissions('clients.view'), getClientOrganizations);
router.get('/learners', authorizeRoles('POLWEL'), requirePermissions('clients.view'), getAllLearners);
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

// Training Coordinator self-scoped views
router.get('/:organizationId/coordinator/course-runs', authorizeRoles('TRAINING_COORDINATOR'), authorizeOrganization, getCoordinatorCourseRunsSelf);
router.get('/:organizationId/coordinator/learners', authorizeRoles('TRAINING_COORDINATOR'), authorizeOrganization, getOrganizationLearnersSelf);

// Resource Library for Training Coordinators
router.get('/:organizationId/resources', authorizeRoles('TRAINING_COORDINATOR'), authorizeOrganization, getCoordinatorResources);

// Analytics routes for Training Coordinators
router.get('/:organizationId/analytics/courses-by-learners', authorizeRoles('TRAINING_COORDINATOR'), authorizeOrganization, getCoursesByLearnersRanking);
router.get('/:organizationId/analytics/divisions-by-learners', authorizeRoles('TRAINING_COORDINATOR'), authorizeOrganization, getDivisionsByLearnersRanking);

export default router;
