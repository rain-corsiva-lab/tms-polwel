import express from 'express';
import { resourceLibraryController } from '../controllers/resourceLibraryController';
import { authenticate, requirePermissions } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Resource Library routes
router.get('/', requirePermissions('resource-library.view'), resourceLibraryController.getAll);
router.get('/:id', requirePermissions('resource-library.view'), resourceLibraryController.getById);
router.post('/', requirePermissions('resource-library.create'), resourceLibraryController.create);
router.put('/:id', requirePermissions('resource-library.edit'), resourceLibraryController.update);
router.patch('/:id/status', requirePermissions('resource-library.edit'), resourceLibraryController.updateStatus);
router.delete('/:id', requirePermissions('resource-library.delete'), resourceLibraryController.delete);

export default router;
