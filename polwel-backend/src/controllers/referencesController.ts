import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';



export const referencesController = {
  // Get all trainers (both internal and partner trainers)
  async getTrainers(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const trainers = await prisma.user.findMany({
        where: {
          role: UserRole.TRAINER,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          email: true,
          partnerOrganization: true,
          certifications: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      const formattedTrainers = trainers.map(trainer => ({
        id: trainer.id,
        name: trainer.name,
        email: trainer.email,
        type: trainer.partnerOrganization ? 'Partner' : 'Trainer',
        organization: trainer.partnerOrganization || 'POLWEL',
        certifications: trainer.certifications || []
      }));

      return res.json({
        success: true,
        data: { trainers: formattedTrainers }
      });
    } catch (error) {
      console.error('Error fetching trainers:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch trainers',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Get all partner organizations
  async getPartners(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const partners = await prisma.user.findMany({
        where: {
          role: UserRole.TRAINER,
          partnerOrganization: {
            not: null
          },
          status: 'ACTIVE'
        },
        select: {
          partnerOrganization: true
        },
        distinct: ['partnerOrganization']
      });

      const uniquePartners = [...new Set(
        partners
          .map(p => p.partnerOrganization)
          .filter(Boolean)
      )].sort();

      return res.json({
        success: true,
        data: { partners: uniquePartners }
      });
    } catch (error) {
      console.error('Error fetching partners:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch partners',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Get all venues
  async getVenues(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const venues = await prisma.venue.findMany({
        where: {
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          address: true,
          capacity: true,
          facilities: true,
          description: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return res.json({
        success: true,
        data: { venues }
      });
    } catch (error) {
      console.error('Error fetching venues:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch venues',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Get course categories
  async getCategories(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const categories = [
        {
          name: "Self-Mastery",
          color: "bg-red-100 text-red-800 border-red-200",
          subcategories: ["Growth Mindset", "Personal Effectiveness", "Self-awareness"]
        },
        {
          name: "Thinking Skills", 
          color: "bg-blue-100 text-blue-800 border-blue-200",
          subcategories: ["Agile Mindset", "Strategic Planning", "Critical Thinking & Creative Problem-Solving"]
        },
        {
          name: "People Skills",
          color: "bg-green-100 text-green-800 border-green-200", 
          subcategories: ["Emotional Intelligence", "Collaboration", "Communication"]
        },
        {
          name: "Leadership Skills",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          subcategories: ["Mindful Leadership", "Empowerment", "Decision-making"]
        }
      ];

      return res.json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
