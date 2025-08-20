import { Request, Response } from 'express';
import prisma from '../lib/prisma';



export const trainerBlockoutController = {
  // Get all blockouts for a trainer
  async getTrainerBlockouts(req: Request, res: Response): Promise<Response | void> {
    try {
      const { trainerId } = req.params;
      const { startDate, endDate } = req.query;

      if (!trainerId) {
        return res.status(400).json({
          success: false,
          error: 'Trainer ID is required'
        });
      }

      let whereClause: any = {
        trainerId: trainerId
      };

      // Add date filtering if provided - check for overlap with date range
      if (startDate && endDate) {
        whereClause.OR = [
          {
            startDate: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          },
          {
            endDate: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          },
          {
            AND: [
              { startDate: { lte: new Date(startDate as string) } },
              { endDate: { gte: new Date(endDate as string) } }
            ]
          }
        ];
      }

      const blockouts = await prisma.trainerBlockout.findMany({
        where: whereClause,
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          startDate: 'asc'
        }
      });

      // Format the response
      const formattedBlockouts = blockouts.map(blockout => ({
        id: blockout.id,
        trainerId: blockout.trainerId,
        trainerName: blockout.trainer.name,
        startDate: blockout.startDate.toISOString().split('T')[0],
        endDate: blockout.endDate.toISOString().split('T')[0],
        reason: blockout.reason,
        type: blockout.type,
        description: blockout.description,
        isRecurring: blockout.isRecurring,
        recurringPattern: blockout.recurringPattern,
        createdAt: blockout.createdAt,
        updatedAt: blockout.updatedAt
      }));

      res.json({
        success: true,
        data: formattedBlockouts,
        message: `Found ${formattedBlockouts.length} blockout(s) for trainer`
      });

    } catch (error) {
      console.error('Error fetching trainer blockouts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trainer blockouts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Get calendar view with grouped blockouts
  async getCalendarView(req: Request, res: Response): Promise<Response | void> {
    try {
      const { trainerId } = req.params;
      const { startDate, endDate, view = 'month' } = req.query;

      if (!trainerId) {
        return res.status(400).json({
          success: false,
          error: 'Trainer ID is required'
        });
      }

      let whereClause: any = {
        trainerId: trainerId
      };

      if (startDate && endDate) {
        whereClause.OR = [
          {
            startDate: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          },
          {
            endDate: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          },
          {
            AND: [
              { startDate: { lte: new Date(startDate as string) } },
              { endDate: { gte: new Date(endDate as string) } }
            ]
          }
        ];
      }

      const blockouts = await prisma.trainerBlockout.findMany({
        where: whereClause,
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          startDate: 'asc'
        }
      });

      // Group blockouts by date for calendar display
      const groupedBlockouts: { [key: string]: any[] } = {};
      
      blockouts.forEach(blockout => {
        // Create entries for each day in the blockout range
        const start = new Date(blockout.startDate);
        const end = new Date(blockout.endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey: string = d.toISOString().substring(0, 10); // YYYY-MM-DD format
          if (!groupedBlockouts[dateKey]) {
            groupedBlockouts[dateKey] = [];
          }
          
          groupedBlockouts[dateKey].push({
            id: blockout.id,
            trainerId: blockout.trainerId,
            trainerName: blockout.trainer.name,
            startDate: blockout.startDate.toISOString().split('T')[0],
            endDate: blockout.endDate.toISOString().split('T')[0],
            reason: blockout.reason,
            type: blockout.type,
            description: blockout.description,
            isRecurring: blockout.isRecurring,
            recurringPattern: blockout.recurringPattern
          });
        }
      });

      res.json({
        success: true,
        data: {
          blockouts: groupedBlockouts,
          view: view,
          totalBlockouts: blockouts.length
        },
        message: `Calendar view for trainer ${trainerId}`
      });

    } catch (error) {
      console.error('Error fetching calendar view:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch calendar view',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Create a new blockout
  async createBlockout(req: Request, res: Response): Promise<Response | void> {
    try {
      const { trainerId, startDate, endDate, reason, type = 'personal', description, isRecurring = false, recurringPattern } = req.body;

      // Validate required fields
      if (!trainerId || !startDate || !endDate || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Trainer ID, start date, end date, and reason are required'
        });
      }

      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'Start date cannot be after end date'
        });
      }

      // Check if trainer exists
      const trainer = await prisma.user.findUnique({
        where: { id: trainerId },
        select: { id: true, name: true, role: true }
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          error: 'Trainer not found'
        });
      }

      if (trainer.role !== 'TRAINER') {
        return res.status(400).json({
          success: false,
          error: 'User is not a trainer'
        });
      }

      // Check for conflicting blockouts
      const conflictingBlockouts = await prisma.trainerBlockout.findMany({
        where: {
          trainerId: trainerId,
          OR: [
            {
              startDate: {
                gte: start,
                lte: end
              }
            },
            {
              endDate: {
                gte: start,
                lte: end
              }
            },
            {
              AND: [
                { startDate: { lte: start } },
                { endDate: { gte: end } }
              ]
            }
          ]
        }
      });

      if (conflictingBlockouts.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Blockout conflicts with existing blockouts',
          conflicts: conflictingBlockouts.map(b => ({
            id: b.id,
            startDate: b.startDate.toISOString().split('T')[0],
            endDate: b.endDate.toISOString().split('T')[0],
            reason: b.reason
          }))
        });
      }

      // Check for conflicting course schedules
      const conflictingCourses = await prisma.courseRun.findMany({
        where: {
          trainerId: trainerId,
          startDate: {
            gte: start,
            lte: end
          },
          status: {
            in: ['ACTIVE', 'PUBLISHED', 'ONGOING']
          }
        },
        include: {
          course: {
            select: { title: true }
          }
        }
      });

      if (conflictingCourses.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Blockout conflicts with scheduled courses',
          conflicts: conflictingCourses.map(c => ({
            id: c.id,
            courseTitle: c.course.title,
            startDate: c.startDate.toISOString().split('T')[0],
            endDate: c.endDate.toISOString().split('T')[0]
          }))
        });
      }

      const newBlockout = await prisma.trainerBlockout.create({
        data: {
          trainerId,
          startDate: start,
          endDate: end,
          reason,
          type,
          description,
          isRecurring,
          recurringPattern
        },
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Log the creation
      console.log(`Created blockout for trainer ${trainer.name}: ${reason} (${startDate} to ${endDate})`);

      res.status(201).json({
        success: true,
        data: {
          id: newBlockout.id,
          trainerId: newBlockout.trainerId,
          trainerName: newBlockout.trainer.name,
          startDate: newBlockout.startDate.toISOString().split('T')[0],
          endDate: newBlockout.endDate.toISOString().split('T')[0],
          reason: newBlockout.reason,
          type: newBlockout.type,
          description: newBlockout.description,
          isRecurring: newBlockout.isRecurring,
          recurringPattern: newBlockout.recurringPattern,
          createdAt: newBlockout.createdAt,
          updatedAt: newBlockout.updatedAt
        },
        message: 'Blockout created successfully'
      });

    } catch (error) {
      console.error('Error creating blockout:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create blockout',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Update a blockout
  async updateBlockout(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { startDate, endDate, reason, type, description, isRecurring, recurringPattern } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Blockout ID is required'
        });
      }

      // Check if blockout exists
      const existingBlockout = await prisma.trainerBlockout.findUnique({
        where: { id },
        include: {
          trainer: {
            select: { id: true, name: true }
          }
        }
      });

      if (!existingBlockout) {
        return res.status(404).json({
          success: false,
          error: 'Blockout not found'
        });
      }

      // Validate date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
          return res.status(400).json({
            success: false,
            error: 'Start date cannot be after end date'
          });
        }

        // Check for conflicts with other blockouts (excluding current one)
        const conflictingBlockouts = await prisma.trainerBlockout.findMany({
          where: {
            id: { not: id },
            trainerId: existingBlockout.trainerId,
            OR: [
              {
                startDate: {
                  gte: start,
                  lte: end
                }
              },
              {
                endDate: {
                  gte: start,
                  lte: end
                }
              },
              {
                AND: [
                  { startDate: { lte: start } },
                  { endDate: { gte: end } }
                ]
              }
            ]
          }
        });

        if (conflictingBlockouts.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'Updated blockout would conflict with existing blockouts',
            conflicts: conflictingBlockouts.map(b => ({
              id: b.id,
              startDate: b.startDate.toISOString().split('T')[0],
              endDate: b.endDate.toISOString().split('T')[0],
              reason: b.reason
            }))
          });
        }
      }

      const updateData: any = {};
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (reason !== undefined) updateData.reason = reason;
      if (type !== undefined) updateData.type = type;
      if (description !== undefined) updateData.description = description;
      if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
      if (recurringPattern !== undefined) updateData.recurringPattern = recurringPattern;

      const updatedBlockout = await prisma.trainerBlockout.update({
        where: { id },
        data: updateData,
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: {
          id: updatedBlockout.id,
          trainerId: updatedBlockout.trainerId,
          trainerName: updatedBlockout.trainer.name,
          startDate: updatedBlockout.startDate.toISOString().split('T')[0],
          endDate: updatedBlockout.endDate.toISOString().split('T')[0],
          reason: updatedBlockout.reason,
          type: updatedBlockout.type,
          description: updatedBlockout.description,
          isRecurring: updatedBlockout.isRecurring,
          recurringPattern: updatedBlockout.recurringPattern,
          createdAt: updatedBlockout.createdAt,
          updatedAt: updatedBlockout.updatedAt
        },
        message: 'Blockout updated successfully'
      });

    } catch (error) {
      console.error('Error updating blockout:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update blockout',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Delete a blockout
  async deleteBlockout(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Blockout ID is required'
        });
      }

      // Check if blockout exists
      const existingBlockout = await prisma.trainerBlockout.findUnique({
        where: { id },
        include: {
          trainer: {
            select: { name: true }
          }
        }
      });

      if (!existingBlockout) {
        return res.status(404).json({
          success: false,
          error: 'Blockout not found'
        });
      }

      await prisma.trainerBlockout.delete({
        where: { id }
      });

      console.log(`Deleted blockout for trainer ${existingBlockout.trainer.name}: ${existingBlockout.reason}`);

      res.json({
        success: true,
        message: 'Blockout deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting blockout:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete blockout',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Get a specific blockout by ID
  async getBlockoutById(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Blockout ID is required'
        });
      }

      const blockout = await prisma.trainerBlockout.findUnique({
        where: { id },
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!blockout) {
        return res.status(404).json({
          success: false,
          error: 'Blockout not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: blockout.id,
          trainerId: blockout.trainerId,
          trainerName: blockout.trainer.name,
          startDate: blockout.startDate.toISOString().split('T')[0],
          endDate: blockout.endDate.toISOString().split('T')[0],
          reason: blockout.reason,
          type: blockout.type,
          description: blockout.description,
          isRecurring: blockout.isRecurring,
          recurringPattern: blockout.recurringPattern,
          createdAt: blockout.createdAt,
          updatedAt: blockout.updatedAt
        }
      });

    } catch (error) {
      console.error('Error fetching blockout:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blockout',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
