import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import {
  getClientOrganizations,
  getClientOrganizationById,
  createClientOrganization,
  updateClientOrganization,
  deleteClientOrganization,
  getOrganizationStats,
  getIndustries
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

export default router;
