import express from 'express';
import { venuesController } from '../controllers/venuesController';
import { authenticateToken, requirePermissions } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/venues - Get all venues
router.get('/', requirePermissions('venues.view'), venuesController.getVenues);

// GET /api/venues/:id - Get venue by ID
router.get('/:id', requirePermissions('venues.view'), venuesController.getVenueById);

// POST /api/venues - Create new venue
router.post('/', requirePermissions('venues.create'), venuesController.createVenue);

// PUT /api/venues/:id - Update venue
router.put('/:id', requirePermissions('venues.edit'), venuesController.updateVenue);

// DELETE /api/venues/:id - Delete venue
router.delete('/:id', requirePermissions('venues.delete'), venuesController.deleteVenue);

// PATCH /api/venues/:id/status - Toggle venue status
router.patch('/:id/status', requirePermissions('venues.edit'), venuesController.toggleVenueStatus);

export default router;
