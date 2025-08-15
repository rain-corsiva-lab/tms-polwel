import { Router } from 'express';
import { 
  getPartners, 
  getPartnerById, 
  createPartner, 
  updatePartner, 
  deletePartner,
  getPartnerStatistics 
} from '../controllers/partnersController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get partner statistics - requires POLWEL role
router.get('/statistics', authorizeRoles('POLWEL'), getPartnerStatistics);

// Get all partners with pagination and filtering - requires POLWEL role
router.get('/', authorizeRoles('POLWEL'), getPartners);

// Get partner by ID - requires POLWEL role
router.get('/:id', authorizeRoles('POLWEL'), getPartnerById);

// Create new partner - requires POLWEL role
router.post('/', authorizeRoles('POLWEL'), createPartner);

// Update partner - requires POLWEL role
router.put('/:id', authorizeRoles('POLWEL'), updatePartner);

// Delete partner (soft delete) - requires POLWEL role
router.delete('/:id', authorizeRoles('POLWEL'), deletePartner);

export default router;
