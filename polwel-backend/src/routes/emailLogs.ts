import { Router } from 'express';
import { emailLogController } from '../controllers/emailLogController';

const router = Router();

// All routes require authentication — applied in index.ts via app.use('/api/email-logs', authenticate, emailLogsRoutes)
router.get('/stats', emailLogController.getEmailLogStats);
router.get('/', emailLogController.getEmailLogs);
router.get('/:id', emailLogController.getEmailLogById);

export default router;
