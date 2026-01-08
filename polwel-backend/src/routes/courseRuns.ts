import { Router } from 'express';
import { courseRunController } from '../controllers/courseRunController';
import { authenticateToken, requirePermissions } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/course-runs/post-management - Dedicated endpoint for Post Run Management page
router.get('/post-management', requirePermissions('course-run.view'), courseRunController.getPostCourseRuns);

// GET /api/course-runs - Get all course runs with pagination and filters
router.get('/', requirePermissions('course-run.view'), courseRunController.getAll);

// GET /api/course-runs/export/csv - Export all course runs to CSV
router.get('/export/csv', requirePermissions('course-run.view'), courseRunController.exportToCSV);

// GET /api/course-runs/status-options - Get status options for filters
router.get('/status-options', requirePermissions('course-run.view'), courseRunController.getStatusOptions);

// GET /api/course-runs/:id/workflow - Retrieve workflow metadata for a course run
router.get('/:id/workflow', requirePermissions('course-run.view'), courseRunController.getWorkflowState);

// GET /api/course-runs/:id - Get single course run by ID
router.get('/:id', requirePermissions('course-run.view'), courseRunController.getById);

// POST /api/course-runs - Create new course run
router.post('/', requirePermissions('course-run.create'), courseRunController.create);

// PUT /api/course-runs/:id - Update course run
router.put('/:id', requirePermissions('course-run.edit'), courseRunController.update);

// POST /api/course-runs/:id/workflow/action - Execute workflow action
router.post('/:id/workflow/action', requirePermissions('course-run.edit'), courseRunController.performWorkflowAction);

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

// DELETE /api/course-runs/:id/learners/:learnerId - Remove learner from course run (soft delete)
router.delete('/:id/learners/:learnerId', requirePermissions('course-run.edit'), courseRunController.removeEnrollment);

// PUT /api/course-runs/:id/trainer-assignments - Update trainer assignments
router.put('/:id/trainer-assignments', requirePermissions('course-run.edit'), courseRunController.updateTrainerAssignments);

// PUT /api/course-runs/:id/partner-assignments - Update partner assignments
router.put('/:id/partner-assignments', requirePermissions('course-run.edit'), courseRunController.updatePartnerAssignments);

// POST /api/course-runs/:id/send-trainer-assignment-email - Send trainer assignment emails
router.post('/:id/send-trainer-assignment-email', requirePermissions('course-run.edit'), courseRunController.sendTrainerAssignmentEmail);

// POST /api/course-runs/:id/mark-confirmed - Mark course run as confirmed (PENDING → CONFIRMED_PENDING_TA_APPROVAL)
router.post('/:id/mark-confirmed', requirePermissions('course-run.edit'), courseRunController.markAsConfirmed);

// POST /api/course-runs/:id/approve-trainer-assignment - Approve trainer assignment (CONFIRMED_PENDING_TA_APPROVAL → CONFIRMED_PENDING_CONFIRMATION_EMAILS)
router.post('/:id/approve-trainer-assignment', requirePermissions('course-run.approve'), courseRunController.approveTrainerAssignment);

// POST /api/course-runs/:id/reject-trainer-assignment - Reject trainer assignment
router.post('/:id/reject-trainer-assignment', requirePermissions('course-run.approve'), courseRunController.rejectTrainerAssignment);

// POST /api/course-runs/:id/send-course-confirmation-email - Send course confirmation email to learners
router.post('/:id/send-course-confirmation-email', requirePermissions('course-run.edit'), courseRunController.sendCourseConfirmationEmail);

// POST /api/course-runs/:id/send-training-assignment-email-learners - Send training assignment email to all learners and trainers
router.post('/:id/send-training-assignment-email-learners', requirePermissions('course-run.edit'), courseRunController.sendTrainingAssignmentEmailToLearners);

// POST /api/course-runs/:courseRunId/learners/:learnerId/withdraw - Withdraw a learner from course run
router.post('/:courseRunId/learners/:learnerId/withdraw', requirePermissions('course-run.edit'), courseRunController.withdrawLearner);

// POST /api/course-runs/:courseRunId/learners/:learnerId/resend-confirmation - Resend confirmation email to a learner
router.post('/:courseRunId/learners/:learnerId/resend-confirmation', requirePermissions('course-run.edit'), courseRunController.resendConfirmationEmail);

// POST /api/course-runs/billing - Save billing information for a course run
router.post('/billing', requirePermissions('post.course.run.edit'), courseRunController.saveBilling);

// GET /api/course-runs/:id/billing-export - Generate billing XLSX export
router.get('/:id/billing-export', requirePermissions('post.course.run.view'), courseRunController.generateBillingExport);

// GET /api/course-runs/:id/participants-export - Export participants with attendance data to XLSX
router.get('/:id/participants-export', requirePermissions('post.course.run.view'), courseRunController.exportParticipantsXLSX);

// GET /api/course-runs/:id/certificates - Get certificate data for learners
router.get('/:id/certificates', requirePermissions('post.course.run.view'), courseRunController.generateCertificates);

// POST /api/course-runs/:id/learners/:enrollmentId/waiver - Submit waiver form for absent learner
router.post('/:id/learners/:enrollmentId/waiver', requirePermissions('post.course.run.edit'), courseRunController.submitWaiverForm);

// GET /api/course-runs/:id/certificates/:learnerId/pdf - Generate individual certificate PDF
router.get('/:id/certificates/:learnerId/pdf', requirePermissions('post.course.run.view'), courseRunController.generateCertificatePDF);

// POST /api/course-runs/:id/certificates/bulk-zip - Generate bulk certificates ZIP
router.post('/:id/certificates/bulk-zip', requirePermissions('post.course.run.view'), courseRunController.generateCertificatesZIP);

// POST /api/course-runs/:id/certificates/send - Send certificates via email to selected learners
router.post('/:id/certificates/send', requirePermissions('post.course.run.edit'), courseRunController.sendCertificatesToLearners);

// GET /api/course-runs/certificates/download/:learnerId/:courseRunId - Public certificate download (no auth required)
router.get('/certificates/download/:learnerId/:courseRunId', courseRunController.downloadCertificatePublic);

export default router;