import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const emailLogController = {
  /**
   * GET /api/email-logs
   * Query params: page, limit, status, emailType, startDate, endDate, search, courseRunId
   */
  async getEmailLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '25',
        status,
        emailType,
        startDate,
        endDate,
        search,
        courseRunId,
      } = req.query as Record<string, string | undefined>;

      const pageNum  = Math.max(1, parseInt(page ?? '1', 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '25', 10)));
      const skip     = (pageNum - 1) * limitNum;

      const where: any = {};

      if (status)      where.status    = status;
      if (emailType)   where.emailType = emailType;
      if (courseRunId) where.courseRunId = courseRunId;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }

      if (search) {
        where.OR = [
          { recipient:    { contains: search } },
          { subject:      { contains: search } },
          { errorMessage: { contains: search } },
        ];
      }

      const [logs, total] = await Promise.all([
        prisma.emailLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          include: {
            courseRun: {
              select: {
                id: true,
                serialNumber: true,
                course: { select: { title: true, courseCode: true } },
              },
            },
          },
        }),
        prisma.emailLog.count({ where }),
      ]);

      res.json({
        success: true,
        logs,
        pagination: {
          page:       pageNum,
          limit:      limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('[emailLogController] getEmailLogs error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve email logs' });
    }
  },

  /**
   * GET /api/email-logs/:id
   */
  async getEmailLogById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID is required' });
        return;
      }

      const log = await prisma.emailLog.findUnique({
        where: { id },
        include: {
          courseRun: {
            select: {
              id: true,
              serialNumber: true,
              course: { select: { title: true, courseCode: true } },
            },
          },
        },
      });

      if (!log) {
        res.status(404).json({ success: false, error: 'Email log not found' });
        return;
      }

      res.json({ success: true, log });
    } catch (error) {
      console.error('[emailLogController] getEmailLogById error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve email log' });
    }
  },

  /**
   * GET /api/email-logs/stats
   * Returns counts by status for dashboard cards
   */
  async getEmailLogStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query as Record<string, string | undefined>;

      const dateFilter: any = {};
      if (startDate || endDate) {
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.lte = end;
        }
      }
      const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

      const stats = await prisma.emailLog.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      });

      const result: Record<string, number> = { PENDING: 0, SENT: 0, FAILED: 0, RETRYING: 0 };
      for (const row of stats) {
        result[row.status] = row._count.status;
      }

      res.json({ success: true, stats: result });
    } catch (error) {
      console.error('[emailLogController] getEmailLogStats error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve email log stats' });
    }
  },
};
