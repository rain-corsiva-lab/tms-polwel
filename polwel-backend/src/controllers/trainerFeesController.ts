import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

// List fees for a trainer
export const listTrainerFees = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params; // trainer id
    if (!id) return res.status(400).json({ success:false, message:'Trainer ID is required' });

    const fees = await prisma.trainerFee.findMany({
      where: { trainerId: id },
      include: { course: { select: { id: true, courseCode: true, title: true } } },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json({ success:true, fees });
  } catch (error:any) {
    console.error('List trainer fees error', error);
    return res.status(500).json({ success:false, message:'Internal server error' });
  }
};

// Create a new trainer fee
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

    // upsert pattern prevented by unique constraint check
    const existing = await prisma.trainerFee.findUnique({ where: { trainerId_courseId: { trainerId: id, courseId } } });
    if (existing) {
      return res.status(409).json({ success:false, message:'Fee for this course already exists. Use update instead.' });
    }

    const fee = await prisma.trainerFee.create({
      data: {
        trainerId: id,
        courseId,
        feePerRun: Number(feePerRun) || 0,
        remarks: remarks || null,
        createdBy: req.user?.userId || null
      },
      include: { course: { select: { id: true, courseCode: true, title: true } } }
    });

    return res.status(201).json({ success:true, fee });
  } catch (error:any) {
    console.error('Create trainer fee error', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ success:false, message:'Duplicate trainer fee' });
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

    // ensure record belongs to trainer
    const feeRecord = await prisma.trainerFee.findFirst({ where: { id: feeId, trainerId: id } });
    if (!feeRecord) return res.status(404).json({ success:false, message:'Trainer fee not found' });

    const updated = await prisma.trainerFee.update({
      where: { id: feeId },
      data: {
        ...(feePerRun !== undefined && { feePerRun: Number(feePerRun) }),
        ...(remarks !== undefined && { remarks })
      },
      include: { course: { select: { id: true, courseCode: true, title: true } } }
    });

    return res.json({ success:true, fee: updated });
  } catch (error:any) {
    console.error('Update trainer fee error', error);
    return res.status(500).json({ success:false, message:'Internal server error' });
  }
};

// Delete trainer fee
export const deleteTrainerFee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, feeId } = req.params;
    if (!id || !feeId) return res.status(400).json({ success:false, message:'Trainer ID and fee ID are required' });

    const feeRecord = await prisma.trainerFee.findFirst({ where: { id: feeId, trainerId: id } });
    if (!feeRecord) return res.status(404).json({ success:false, message:'Trainer fee not found' });

    await prisma.trainerFee.delete({ where: { id: feeId } });
    return res.json({ success:true, message:'Trainer fee deleted' });
  } catch (error:any) {
    console.error('Delete trainer fee error', error);
    return res.status(500).json({ success:false, message:'Internal server error' });
  }
};
