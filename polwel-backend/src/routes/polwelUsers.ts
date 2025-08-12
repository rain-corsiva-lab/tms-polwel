import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import {
  getPolwelUsers,
  getPolwelUserById,
  createPolwelUser,
  updatePolwelUser,
  deletePolwelUser,
  resetPolwelUserPassword,
  togglePolwelUserMfa,
  getAvailablePermissions
} from '../controllers/polwelUsersController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Apply POLWEL role authorization to all routes
router.use(authorizeRoles('POLWEL'));

// Get available permissions
router.get('/permissions', getAvailablePermissions);

// POLWEL Users routes
router.get('/', getPolwelUsers);
router.get('/:id', getPolwelUserById);
router.post('/', createPolwelUser);
router.put('/:id', updatePolwelUser);
router.delete('/:id', deletePolwelUser);
router.post('/:id/reset-password', resetPolwelUserPassword);
router.post('/:id/toggle-mfa', togglePolwelUserMfa);

export default router;
