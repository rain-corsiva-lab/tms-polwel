import express from 'express';
import { venuesController } from '../controllers/venuesController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/venues - Get all venues
router.get('/', venuesController.getVenues);

// GET /api/venues/:id - Get venue by ID
router.get('/:id', venuesController.getVenueById);

// POST /api/venues - Create new venue
router.post('/', venuesController.createVenue);

// PUT /api/venues/:id - Update venue
router.put('/:id', venuesController.updateVenue);

// DELETE /api/venues/:id - Delete venue
router.delete('/:id', venuesController.deleteVenue);

// PATCH /api/venues/:id/status - Toggle venue status
router.patch('/:id/status', venuesController.toggleVenueStatus);

export default router;
