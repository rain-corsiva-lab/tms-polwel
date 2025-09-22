import express from 'express';
import { coursesController } from '../controllers/coursesController';
import { authenticate, requirePermissions } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Course CRUD routes
router.get('/', requirePermissions('courses.view'), coursesController.getCourses);                    // GET /api/courses
router.get('/statistics', requirePermissions('courses.view'), coursesController.getCourseStatistics);   // GET /api/courses/statistics
router.get('/:id', requirePermissions('courses.view'), coursesController.getCourseById);                // GET /api/courses/:id
router.post('/', requirePermissions('courses.create'), coursesController.createCourse);                   // POST /api/courses
router.put('/:id', requirePermissions('courses.edit'), coursesController.updateCourse);                 // PUT /api/courses/:id
router.delete('/:id', requirePermissions('courses.delete'), coursesController.deleteCourse);              // DELETE /api/courses/:id

export default router;
