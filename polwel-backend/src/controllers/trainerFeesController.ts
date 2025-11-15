import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

// List fees for a trainer
export const listTrainerFees = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params; // trainer id
    if (!id) return res.status(400).json({ success:false, message:'Trainer ID is required' });

    // Read from course_trainers instead of trainer_fees
    const courseTrainers = await prisma.courseTrainer.findMany({
      where: { trainerId: id },
      include: { course: { select: { id: true, courseCode: true, title: true } } },
      orderBy: { updatedAt: 'desc' }
    });

    // Transform to match expected format
    const fees = courseTrainers.map(ct => ({
      id: ct.id,
      feePerRun: ct.feePerRun,
      remarks: ct.remarks,
      course: ct.course
    }));

    return res.json({ success:true, fees });
  } catch (error:any) {
    console.error('List trainer fees error', error);
    return res.status(500).json({ success:false, message:'Internal server error' });
  }
};

// Create a new trainer fee (add trainer to course)
export const createTrainerFee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params; // trainer id
    const { courseId, feePerRun, remarks } = req.body;

    if (!id || !courseId || feePerRun === undefined) {
      return res.status(400).json({ success:false, message:'Trainer ID, courseId and feePerRun are required' });
    }

    // verify trainer exists
    const trainer = await prisma.user.findUnique({ where: { id } });
    if (!trainer) return res.status(404).json({ success:false, message:'Trainer not found' });

    // verify course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });

    // Check if trainer already assigned to course
    const existing = await prisma.courseTrainer.findUnique({ where: { courseId_trainerId: { trainerId: id, courseId } } });
    if (existing) {
      return res.status(409).json({ success:false, message:'Trainer already assigned to this course. Use update instead.' });
    }

    const created = await prisma.courseTrainer.create({
      data: {
        trainerId: id,
        courseId,
        feePerRun: Number(feePerRun) || 0,
        remarks: remarks || null
      },
      include: { course: { select: { id: true, courseCode: true, title: true } } }
    });

    // Transform to match expected format
    const fee = {
      id: created.id,
      feePerRun: created.feePerRun,
      remarks: created.remarks,
      course: created.course
    };

    return res.status(201).json({ success:true, fee });
  } catch (error:any) {
    console.error('Create trainer fee error', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ success:false, message:'Duplicate trainer assignment' });
    }
    return res.status(500).json({ success:false, message:'Internal server error' });
  }
};

// Update trainer fee
export const updateTrainerFee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, feeId } = req.params;
    const { feePerRun, remarks } = req.body;

    if (!id || !feeId) return res.status(400).json({ success:false, message:'Trainer ID and fee ID are required' });

    // ensure record belongs to trainer in course_trainers
    const feeRecord = await prisma.courseTrainer.findFirst({ where: { id: feeId, trainerId: id } });
    if (!feeRecord) return res.status(404).json({ success:false, message:'Trainer fee not found' });

    const updated = await prisma.courseTrainer.update({
      where: { id: feeId },
      data: {
        ...(feePerRun !== undefined && { feePerRun: Number(feePerRun) }),
        ...(remarks !== undefined && { remarks })
      },
      include: { course: { select: { id: true, courseCode: true, title: true } } }
    });

    // Transform to match expected format
    const fee = {
      id: updated.id,
      feePerRun: updated.feePerRun,
      remarks: updated.remarks,
      course: updated.course
    };

    return res.json({ success:true, fee });
  } catch (error:any) {
    console.error('Update trainer fee error', error);
    return res.status(500).json({ success:false, message:'Internal server error' });
  }
};

// Delete trainer fee (removes trainer from course)
export const deleteTrainerFee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, feeId } = req.params;
    if (!id || !feeId) return res.status(400).json({ success:false, message:'Trainer ID and fee ID are required' });

    const feeRecord = await prisma.courseTrainer.findFirst({ where: { id: feeId, trainerId: id } });
    if (!feeRecord) return res.status(404).json({ success:false, message:'Trainer fee not found' });

    // Delete from course_trainers (removes trainer from course)
    await prisma.courseTrainer.delete({ where: { id: feeId } });
    return res.json({ success:true, message:'Trainer fee deleted' });
  } catch (error:any) {
    console.error('Delete trainer fee error', error);
    return res.status(500).json({ success:false, message:'Internal server error' });
  }
};
