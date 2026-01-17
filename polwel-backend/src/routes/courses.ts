import express from 'express';
import { coursesController } from '../controllers/coursesController';
import { authenticate, requirePermissions } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Course CRUD routes
router.get('/', requirePermissions('course-venue.view'), coursesController.getCourses);                    // GET /api/courses
router.get('/statistics', requirePermissions('course-venue.view'), coursesController.getCourseStatistics);   // GET /api/courses/statistics
router.get('/:id', requirePermissions('course-venue.view'), coursesController.getCourseById);                // GET /api/courses/:id
router.post('/', requirePermissions('course-venue.create'), coursesController.createCourse);                   // POST /api/courses
router.put('/:id', requirePermissions('course-venue.edit'), coursesController.updateCourse);                 // PUT /api/courses/:id
router.patch('/:id/toggle-status', requirePermissions('course-venue.edit'), coursesController.toggleCourseStatus); // PATCH /api/courses/:id/toggle-status
router.delete('/:id', requirePermissions('course-venue.delete'), coursesController.deleteCourse);              // DELETE /api/courses/:id

export default router;
