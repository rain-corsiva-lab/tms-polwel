import { Router } from 'express';
import { waiverController } from '../controllers/waiverController';
import { authenticateToken, requirePermissions } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/waivers - Get all waiver requests with pagination and filters
router.get('/', requirePermissions('post.course.run.view'), waiverController.getAll);

// GET /api/waivers/:id - Get a single waiver request details
router.get('/:id', requirePermissions('post.course.run.view'), waiverController.getById);

// GET /api/waivers/:id/document - Get waiver supporting document info
router.get('/:id/document', requirePermissions('post.course.run.view'), waiverController.downloadDocument);

// POST /api/waivers/:id/approve - Approve a waiver request
router.post('/:id/approve', requirePermissions('post.course.run.edit'), waiverController.approve);

// POST /api/waivers/:id/reject - Reject a waiver request
router.post('/:id/reject', requirePermissions('post.course.run.edit'), waiverController.reject);

export default router;
