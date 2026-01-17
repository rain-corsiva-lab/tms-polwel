import express from 'express';
import { venuesController } from '../controllers/venuesController';
import { authenticateToken, requirePermissions } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/venues - Get all venues

// GET /api/venues/:id - Get venue by ID

// POST /api/venues - Create new venue

// PUT /api/venues/:id - Update venue

// DELETE /api/venues/:id - Delete venue

// PATCH /api/venues/:id/status - Toggle venue status
router.get('/', requirePermissions('course-venue.view'), venuesController.getVenues);

router.get('/:id', requirePermissions('course-venue.view'), venuesController.getVenueById);

router.post('/', requirePermissions('course-venue.create'), venuesController.createVenue);

router.put('/:id', requirePermissions('course-venue.edit'), venuesController.updateVenue);

router.delete('/:id', requirePermissions('course-venue.delete'), venuesController.deleteVenue);

router.patch('/:id/status', requirePermissions('course-venue.edit'), venuesController.toggleVenueStatus);

export default router;
