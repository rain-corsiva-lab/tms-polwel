import { Router } from 'express';
import { 
  getPartners, 
  getPartnerById, 
  createPartner, 
  updatePartner, 
  deletePartner,
  getPartnerStatistics 
} from '../controllers/partnersController';
import { authenticateToken, authorizeRoles, requirePermissions } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get partner statistics - requires POLWEL role
router.get('/statistics', authorizeRoles('POLWEL'), requirePermissions('clients.view'), getPartnerStatistics);

// Get all partners with pagination and filtering - requires POLWEL role
router.get('/', authorizeRoles('POLWEL'), requirePermissions('clients.view'), getPartners);

// Get partner by ID - requires POLWEL role
router.get('/:id', authorizeRoles('POLWEL'), requirePermissions('clients.view'), getPartnerById);

// Create new partner - requires POLWEL role
router.post('/', authorizeRoles('POLWEL'), requirePermissions('clients.create'), createPartner);

// Update partner - requires POLWEL role
router.put('/:id', authorizeRoles('POLWEL'), requirePermissions('clients.edit'), updatePartner);

// Delete partner (soft delete) - requires POLWEL role
router.delete('/:id', authorizeRoles('POLWEL'), requirePermissions('clients.delete'), deletePartner);

export default router;
