import express from 'express';
import { authenticateToken, requirePermissions } from '../middleware/auth';

const router = express.Router();

// Protect bookings list with finance/bookings view permission
router.use(authenticateToken);

router.get('/', requirePermissions('bookings.view'), (req, res) => {
  res.json({ message: 'Bookings endpoint - coming soon' });
});

export default router;
