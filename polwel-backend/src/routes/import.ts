import { Router } from 'express';
import multer from 'multer';
import { requirePermissions } from '../middleware/auth';
import {
  importCourseRuns,
  importLearners,
  previewCourseRuns,
  previewLearners,
} from '../controllers/importController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  },
});

// Preview endpoints (parse without saving)
router.post('/course-runs/preview', requirePermissions('course-run.create'), upload.single('file'), previewCourseRuns);
router.post('/learners/preview', requirePermissions('course-run.create'), upload.single('file'), previewLearners);

// Import endpoints (parse and save)
router.post('/course-runs', requirePermissions('course-run.create'), upload.single('file'), importCourseRuns);
router.post('/learners', requirePermissions('course-run.create'), upload.single('file'), importLearners);

export default router;
