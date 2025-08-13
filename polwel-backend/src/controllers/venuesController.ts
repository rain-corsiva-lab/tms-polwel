import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Contact {
  id: string;
  name: string;
  number: string;
  email: string;
}

interface VenueCreateRequest {
  name: string;
  capacity?: string;
  address?: string;
  description?: string;
  facilities?: string[];
  contacts: Contact[];
  feeType: 'PER_HEAD' | 'PER_VENUE';
  fee: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  remarks?: string;
}

interface VenueUpdateRequest extends VenueCreateRequest {
  id: string;
}

export const venuesController = {
  // Get all venues
  getVenues: async (req: Request, res: Response) => {
    try {
      const venues = await prisma.venue.findMany({
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              bookings: true,
              courseRuns: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform venues to match frontend expectations
      const transformedVenues = venues.map(venue => ({
        ...venue,
        feeType: venue.feeType.toLowerCase(), // Convert PER_HEAD to per_head
        contacts: Array.isArray(venue.contacts) ? venue.contacts : [],
        bookingCount: venue._count.bookings,
        courseRunCount: venue._count.courseRuns
      }));

      res.json({
        success: true,
        data: transformedVenues
      });
    } catch (error) {
      console.error('Error fetching venues:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch venues'
      });
    }
  },

  // Get venue by ID
  getVenueById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Venue ID is required'
        });
      }

      const venue = await prisma.venue.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          bookings: {
            select: {
              id: true,
              bookingReference: true,
              status: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5
          },
          courseRuns: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              course: {
                select: {
                  id: true,
                  title: true
                }
              }
            },
            orderBy: {
              startDate: 'desc'
            },
            take: 5
          }
        }
      });

      if (!venue) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found'
        });
      }

      // Transform venue to match frontend expectations
      const transformedVenue = {
        ...venue,
        feeType: venue.feeType.toLowerCase(), // Convert PER_HEAD to per_head
        contacts: Array.isArray(venue.contacts) ? venue.contacts : []
      };

      return res.json({
        success: true,
        data: {
          venue: transformedVenue
        }
      });
    } catch (error) {
      console.error('Error fetching venue:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch venue'
      });
    }
  },

  // Create new venue
  createVenue: async (req: Request, res: Response) => {
    try {
      const venueData: VenueCreateRequest = req.body;
      const userId = (req as any).user?.id;

      // Validate required fields
      if (!venueData.name) {
        return res.status(400).json({
          success: false,
          error: 'Venue name is required'
        });
      }

      // Validate contacts
      if (!venueData.contacts || venueData.contacts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one contact is required'
        });
      }

      const validContacts = venueData.contacts.filter(contact => 
        contact.name?.trim() && contact.number?.trim() && contact.email?.trim()
      );

      if (validContacts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one complete contact (name, number, email) is required'
        });
      }

      const dataToCreate = {
        name: venueData.name.trim(),
        capacity: venueData.capacity || '',
        contacts: JSON.parse(JSON.stringify(validContacts)), // Serialize/deserialize to ensure JSON compatibility
        feeType: venueData.feeType || 'PER_VENUE',
        fee: venueData.fee || 0,
        status: venueData.status || 'ACTIVE',
        createdBy: userId,
        ...(venueData.address && { address: venueData.address.trim() }),
        ...(venueData.description && { description: venueData.description.trim() }),
        ...(venueData.facilities && { facilities: venueData.facilities }),
        ...(venueData.remarks && { remarks: venueData.remarks.trim() })
      } as any; // Type assertion for Prisma compatibility

      const venue = await prisma.venue.create({
        data: dataToCreate,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Transform venue to match frontend expectations
      const transformedVenue = {
        ...venue,
        feeType: venue.feeType.toLowerCase(),
        contacts: Array.isArray(venue.contacts) ? venue.contacts : []
      };

      return res.status(201).json({
        success: true,
        data: {
          venue: transformedVenue
        }
      });
    } catch (error) {
      console.error('Error creating venue:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create venue'
      });
    }
  },

  // Update venue
  updateVenue: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const venueData: VenueUpdateRequest = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Venue ID is required'
        });
      }

      // Check if venue exists
      const existingVenue = await prisma.venue.findUnique({
        where: { id }
      });

      if (!existingVenue) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found'
        });
      }

      // Validate required fields
      if (!venueData.name) {
        return res.status(400).json({
          success: false,
          error: 'Venue name is required'
        });
      }

      // Validate contacts
      if (!venueData.contacts || venueData.contacts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one contact is required'
        });
      }

      const validContacts = venueData.contacts.filter(contact => 
        contact.name?.trim() && contact.number?.trim() && contact.email?.trim()
      );

      if (validContacts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one complete contact (name, number, email) is required'
        });
      }

      const dataToUpdate = {
        name: venueData.name.trim(),
        capacity: venueData.capacity || '',
        contacts: JSON.parse(JSON.stringify(validContacts)), // Serialize/deserialize to ensure JSON compatibility
        feeType: venueData.feeType || 'PER_VENUE',
        fee: venueData.fee || 0,
        status: venueData.status || 'ACTIVE',
        ...(venueData.address !== undefined && { address: venueData.address?.trim() || null }),
        ...(venueData.description !== undefined && { description: venueData.description?.trim() || null }),
        ...(venueData.facilities !== undefined && { facilities: venueData.facilities || [] }),
        ...(venueData.remarks !== undefined && { remarks: venueData.remarks?.trim() || null })
      } as any; // Type assertion for Prisma compatibility

      const venue = await prisma.venue.update({
        where: { id },
        data: dataToUpdate,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Transform venue to match frontend expectations
      const transformedVenue = {
        ...venue,
        feeType: venue.feeType.toLowerCase(),
        contacts: Array.isArray(venue.contacts) ? venue.contacts : []
      };

      return res.json({
        success: true,
        data: {
          venue: transformedVenue
        }
      });
    } catch (error) {
      console.error('Error updating venue:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update venue'
      });
    }
  },

  // Delete venue
  deleteVenue: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Venue ID is required'
        });
      }

      // Check if venue exists
      const existingVenue = await prisma.venue.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              bookings: true,
              courseRuns: true
            }
          }
        }
      });

      if (!existingVenue) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found'
        });
      }

      // Check if venue is being used
      if (existingVenue._count.bookings > 0 || existingVenue._count.courseRuns > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete venue as it is being used in bookings or course runs. Consider marking it as inactive instead.'
        });
      }

      await prisma.venue.delete({
        where: { id }
      });

      return res.json({
        success: true,
        message: 'Venue deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting venue:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete venue'
      });
    }
  },

  // Toggle venue status (activate/deactivate)
  toggleVenueStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Venue ID is required'
        });
      }

      const venue = await prisma.venue.update({
        where: { id },
        data: { status },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      const transformedVenue = {
        ...venue,
        feeType: venue.feeType.toLowerCase(),
        contacts: Array.isArray(venue.contacts) ? venue.contacts : []
      };

      return res.json({
        success: true,
        data: {
          venue: transformedVenue
        }
      });
    } catch (error) {
      console.error('Error toggling venue status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update venue status'
      });
    }
  }
};
