import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all courses (protected - requires authentication)
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        _count: {
          select: {
            runs: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get course by ID (protected - requires authentication)
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ error: 'Course ID is required' });
      return;
    }
    
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        runs: {
          include: {
            venue: true,
            bookings: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new course (protected - POLWEL and TRAINING_COORDINATOR only)
router.post('/', authenticateToken, authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      objectives = [],
      duration,
      maxParticipants,
      minParticipants = 1,
      category,
      level,
      prerequisites = [],
      materials = [],
      courseFee = 0,
      amountPerPax = 0,
      status = 'DRAFT'
    } = req.body;

    if (!title || !duration || !maxParticipants) {
      res.status(400).json({ error: 'Title, duration, and maxParticipants are required' });
      return;
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        objectives,
        duration,
        maxParticipants,
        minParticipants,
        category,
        level,
        prerequisites,
        materials,
        courseFee,
        amountPerPax,
        status
      }
    });

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update course (protected - POLWEL and TRAINING_COORDINATOR only)
router.put('/:id', authenticateToken, authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ error: 'Course ID is required' });
      return;
    }
    
    const updateData = req.body;

    const course = await prisma.course.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete course (protected - POLWEL only)
router.delete('/:id', authenticateToken, authorizeRoles('POLWEL'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ error: 'Course ID is required' });
      return;
    }

    await prisma.course.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
