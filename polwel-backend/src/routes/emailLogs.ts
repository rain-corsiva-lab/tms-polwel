import { Router } from 'express';
import { emailLogController } from '../controllers/emailLogController';

const router = Router();

// All routes require authentication — applied in index.ts via app.use('/api/email-logs', authenticate, emailLogsRoutes)
router.get('/stats', emailLogController.getEmailLogStats);
router.get('/retry-queue', emailLogController.getRetryQueue);
router.get('/retry-queue/:id', emailLogController.getRetryQueueById);
router.delete('/retry-queue/:id', emailLogController.cancelRetryJob);
router.get('/', emailLogController.getEmailLogs);
router.get('/:id', emailLogController.getEmailLogById);

export default router;
