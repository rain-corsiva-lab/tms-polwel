import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { resourceLibraryController } from '../controllers/resourceLibraryController';
import { authenticate, requirePermissions } from '../middleware/auth';

const router = express.Router();

const resourceLibraryDir = path.join(process.cwd(), 'uploads/resource-library');
if (!fs.existsSync(resourceLibraryDir)) {
  fs.mkdirSync(resourceLibraryDir, { recursive: true });
}

const resourceLibraryStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, resourceLibraryDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const resourceLibraryUpload = multer({
  storage: resourceLibraryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pdf' || file.fieldname === 'file') {
      if (file.mimetype === 'application/pdf') {
        return cb(null, true);
      }
      return cb(new Error('Only PDF files are allowed for the document field'));
    }
    if (file.fieldname === 'coverImage') {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (allowed.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error('Cover image must be JPG, PNG, GIF, or WebP'));
    }
    return cb(new Error(`Unexpected file field: ${file.fieldname}`));
  },
});

const resourceLibraryUploadFields = resourceLibraryUpload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

/** Only run multer when client sends multipart/form-data; JSON requests skip this. */
function resourceLibraryMultipart(req: Request, res: Response, next: NextFunction): void {
  const ct = req.headers['content-type'];
  if (typeof ct === 'string' && ct.includes('multipart/form-data')) {
    resourceLibraryUploadFields(req, res, next);
    return;
  }
  next();
}

router.use(authenticate);

router.get('/', requirePermissions('resource-library.view'), resourceLibraryController.getAll);
router.get('/:id', requirePermissions('resource-library.view'), resourceLibraryController.getById);
router.post(
  '/',
  requirePermissions('resource-library.create'),
  resourceLibraryMultipart,
  resourceLibraryController.create,
);
router.put(
  '/:id',
  requirePermissions('resource-library.edit'),
  resourceLibraryMultipart,
  resourceLibraryController.update,
);
router.patch('/:id/status', requirePermissions('resource-library.edit'), resourceLibraryController.updateStatus);
router.delete('/:id', requirePermissions('resource-library.delete'), resourceLibraryController.delete);

export default router;
