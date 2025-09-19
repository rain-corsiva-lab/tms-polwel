import express from 'express';
import { authenticateToken, authorizeRoles, requirePermissions } from '../middleware/auth';
import {
  getPolwelUsers,
  getPolwelUserById,
  createPolwelUser,
  updatePolwelUser,
  deletePolwelUser,
  resetPolwelUserPassword,
  getAvailablePermissions,
  getUserAuditTrail,
  sendPasswordResetLink,
  getPolwelUserDetails,
  resendPolwelUserSetup
} from '../controllers/polwelUsersController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Apply POLWEL role authorization to all routes
router.use(authorizeRoles('POLWEL'));

// Get available permissions
router.get('/permissions', requirePermissions('users.view'), getAvailablePermissions);

// POLWEL Users routes
router.get('/', requirePermissions('users.view'), getPolwelUsers);
router.get('/:id', requirePermissions('users.view'), getPolwelUserById);
router.get('/:id/details', requirePermissions('users.view'), getPolwelUserDetails);
router.get('/:id/audit-trail', requirePermissions('users.view'), getUserAuditTrail);
router.post('/', requirePermissions('users.create'), createPolwelUser);
router.put('/:id', requirePermissions('users.edit'), updatePolwelUser);
router.delete('/:id', requirePermissions('users.delete'), deletePolwelUser);
router.post('/:id/reset-password', requirePermissions('users.edit'), resetPolwelUserPassword);
router.post('/:id/send-reset-link', requirePermissions('users.edit'), sendPasswordResetLink);
router.post('/:id/resend-setup', requirePermissions('users.edit'), resendPolwelUserSetup);

export default router;
