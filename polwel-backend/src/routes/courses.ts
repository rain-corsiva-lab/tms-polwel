import express from 'express';
import { coursesController } from '../controllers/coursesController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Course CRUD routes
router.get('/', coursesController.getCourses);                    // GET /api/courses
router.get('/statistics', coursesController.getCourseStatistics);   // GET /api/courses/statistics
router.get('/:id', coursesController.getCourseById);                // GET /api/courses/:id
router.post('/', coursesController.createCourse);                   // POST /api/courses
router.put('/:id', coursesController.updateCourse);                 // PUT /api/courses/:id
router.patch('/:id/status', coursesController.updateCourseStatus);  // PATCH /api/courses/:id/status
router.delete('/:id', coursesController.deleteCourse);              // DELETE /api/courses/:id

export default router;
