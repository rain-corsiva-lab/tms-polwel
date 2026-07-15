import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { getDuplicateCourseRuns, mergeDuplicateCourseRuns } from '../controllers/courseRunMergerController';

const router = express.Router();

// Apply auth middleware
router.use(authenticateToken);

// Duplicate Course Runs Merger routes (POLWEL admin only)
router.get('/duplicates', authorizeRoles('POLWEL'), getDuplicateCourseRuns);
router.post('/merge', authorizeRoles('POLWEL'), mergeDuplicateCourseRuns);

export default router;
