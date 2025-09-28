import { Router } from 'express';
import { courseRunController } from '../controllers/courseRunController';
import { authenticateToken, requirePermissions } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/course-runs - Get all course runs with pagination and filters
router.get('/', requirePermissions('courses.view'), courseRunController.getAll);

// GET /api/course-runs/status-options - Get status options for filters
router.get('/status-options', requirePermissions('courses.view'), courseRunController.getStatusOptions);

// GET /api/course-runs/:id - Get single course run by ID
router.get('/:id', requirePermissions('courses.view'), courseRunController.getById);

// POST /api/course-runs - Create new course run
router.post('/', requirePermissions('courses.create'), courseRunController.create);

// PUT /api/course-runs/:id - Update course run
router.put('/:id', requirePermissions('courses.edit'), courseRunController.update);

// POST /api/course-runs/:id/cancel - Cancel course run
router.post('/:id/cancel', requirePermissions('courses.edit'), courseRunController.cancel);

// DELETE /api/course-runs/:id - Delete course run (soft delete)
router.delete('/:id', requirePermissions('courses.delete'), courseRunController.delete);

export default router;