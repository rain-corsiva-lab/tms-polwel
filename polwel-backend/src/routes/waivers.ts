import { Router } from 'express';
import { waiverController } from '../controllers/waiverController';
import { authenticateToken, requirePermissions } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/waivers - Get all waiver requests with pagination and filters
router.get('/', requirePermissions('waiver.view'), waiverController.getAll);

// GET /api/waivers/:id - Get a single waiver request details
router.get('/:id', requirePermissions('waiver.view'), waiverController.getById);

// GET /api/waivers/:id/document - Get waiver supporting document info
router.get('/:id/document', requirePermissions('waiver.view'), waiverController.downloadDocument);

// POST /api/waivers/:id/approve - Approve a waiver request (requires waiver.edit OR waiver.approve)
router.post('/:id/approve', requirePermissions(['waiver.edit', 'waiver.approve']), waiverController.approve);

// POST /api/waivers/:id/reject - Reject a waiver request (requires waiver.edit OR waiver.approve)
router.post('/:id/reject', requirePermissions(['waiver.edit', 'waiver.approve']), waiverController.reject);

export default router;
