import express from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getProfile);
router.put('/', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

export default router;
