import { Router } from 'express';
import { courseRunController } from '../controllers/courseRunController';
import { authenticateToken, requirePermissions } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/course-runs - Get all course runs with pagination and filters
router.get('/', requirePermissions('course-run.view'), courseRunController.getAll);

// GET /api/course-runs/status-options - Get status options for filters
router.get('/status-options', requirePermissions('course-run.view'), courseRunController.getStatusOptions);

// GET /api/course-runs/:id - Get single course run by ID
router.get('/:id', requirePermissions('course-run.view'), courseRunController.getById);

// POST /api/course-runs - Create new course run
router.post('/', requirePermissions('course-run.create'), courseRunController.create);

// PUT /api/course-runs/:id - Update course run
router.put('/:id', requirePermissions('course-run.edit'), courseRunController.update);

// POST /api/course-runs/:id/cancel - Cancel course run
router.post('/:id/cancel', requirePermissions('course-run.edit'), courseRunController.cancel);

// DELETE /api/course-runs/:id - Delete course run (soft delete)
router.delete('/:id', requirePermissions('course-run.delete'), courseRunController.delete);

// POST /api/course-runs/:id/enroll-learner - Enroll single learner
router.post('/:id/enroll-learner', requirePermissions('course-run.edit'), courseRunController.enrollLearner);

// POST /api/course-runs/:id/enroll-learners - Enroll multiple learners
router.post('/:id/enroll-learners', requirePermissions('course-run.edit'), courseRunController.enrollLearners);

// POST /api/course-runs/:id/import-learners - Bulk import learners from file
router.post('/:id/import-learners', requirePermissions('course-run.edit'), courseRunController.importLearners);

// GET /api/course-runs/:id/learners - Get enrolled learners
router.get('/:id/learners', requirePermissions('course-run.view'), courseRunController.getLearners);

// GET /api/course-runs/:id/attendance - Get attendance records for a course run
router.get('/:id/attendance', requirePermissions('course-run.view'), courseRunController.getAttendance);

// PUT /api/course-runs/:id/attendance - Save attendance for a specific day
router.put('/:id/attendance', requirePermissions('course-run.edit'), courseRunController.saveAttendance);

// PUT /api/course-runs/:id/learners/:learnerId - Update learner enrollment
router.put('/:id/learners/:learnerId', requirePermissions('course-run.edit'), courseRunController.updateEnrollment);

export default router;