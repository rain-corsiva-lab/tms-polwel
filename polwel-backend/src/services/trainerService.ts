import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

const toNumber = (value: Prisma.Decimal | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof (value as any).toNumber === 'function') {
    return (value as any).toNumber();
  }
  return Number(value);
};

export interface TrainerCourseRunsParams {
  trainerId: string;
  startDate?: string;
  endDate?: string;
}

export interface TrainerTrainingSummaryParams extends TrainerCourseRunsParams {
  page?: number | string;
  limit?: number | string;
}

export const fetchTrainerCourseRuns = async ({ trainerId, startDate, endDate }: TrainerCourseRunsParams) => {
  const whereClause: Prisma.CourseRunWhereInput = {
    deletedAt: null,
    courseRunTrainers: {
      some: {
        trainerId,
        deletedAt: null,
      },
    },
  };

  const range: Prisma.DateTimeFilter = {};

  const parseDate = (value?: string) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (start) {
    start.setHours(0, 0, 0, 0);
    range.gte = start;
  }

  if (end) {
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }

  if (Object.keys(range).length > 0) {
    whereClause.startDatetime = range;
  }

  const runs = await prisma.courseRun.findMany({
    where: whereClause,
    include: {
      course: {
        select: {
          title: true,
          category: true,
        },
      },
      venue: {
        select: {
          name: true,
          address: true,
        },
      },
      _count: {
        select: {
          courseRunLearners: true,
        },
      },
    },
    orderBy: {
      startDatetime: 'asc',
    },
  });

  return runs
    .map((run) => {
      if (!run.startDatetime) {
        return null;
      }

      const formatDate = (value?: Date | null) => {
        if (!value) return '';
        const iso = value.toISOString();
        return iso.split('T')[0];
      };

      const formatTime = (value?: Date | null) => {
        if (!value) return '';
        return value.toTimeString().split(' ')[0];
      };

      return {
        id: run.id,
        courseId: run.courseId,
        startDate: formatDate(run.startDatetime),
        endDate: formatDate(run.endDatetime),
        startTime: formatTime(run.startDatetime),
        endTime: formatTime(run.endDatetime),
        status: run.status,
        currentParticipants: run._count?.courseRunLearners ?? 0,
        maxParticipants: run.maxClassSize ?? 0,
        course: {
          title: run.course?.title || 'Untitled Course',
          category: run.course?.category || 'General',
        },
        courseName: run.course?.title || 'Untitled Course',
        courseCategory: run.course?.category || 'General',
        venue: run.venue
          ? {
              name: run.venue.name,
              address: run.venue.address,
            }
          : null,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
};

export const fetchTrainerTrainingSummary = async ({
  trainerId,
  startDate,
  endDate,
  page = 1,
  limit = 10,
}: TrainerTrainingSummaryParams) => {
  const pageNumber = Math.max(parseInt(String(page), 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 100);

  const parseDate = (value?: string) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  const courseRunFilter: Prisma.CourseRunWhereInput = {
    deletedAt: null,
  };

  if (start || end) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (start) {
      start.setHours(0, 0, 0, 0);
      dateFilter.gte = start;
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    courseRunFilter.startDatetime = dateFilter;
  }

  const whereClause: Prisma.CourseRunTrainerWhereInput = {
    trainerId,
    deletedAt: null,
    courseRun: {
      is: courseRunFilter,
    },
  };


  const [totalItems, rows] = await Promise.all([
    prisma.courseRunTrainer.count({ where: whereClause }),
    prisma.courseRunTrainer.findMany({
      where: whereClause,
      include: {
        courseRun: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        courseRun: {
          startDatetime: 'desc',
        },
      },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const formatDate = (value?: Date | null) => {
    if (!value) return '';
    return value.toISOString().split('T')[0];
  };

  const items = rows
    .map((row) => {
      const startIso = formatDate(row.courseRun?.startDatetime);
      if (!startIso) {
        return null;
      }

      const baseAmount = toNumber(row.trainerBaseAmount);
      const additional = toNumber(row.additionalCost);
      let fee = baseAmount + additional;

      return {
        id: row.id,
        courseRunId: row.courseRunId,
        courseId: row.courseRun?.courseId,
        courseTitle: row.courseRun?.course?.title || 'Untitled Course',
        startDate: startIso,
        fee,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const decoratedItems = items;

  const totalsAggregate = await prisma.courseRunTrainer.aggregate({
    where: whereClause,
    _sum: {
      trainerBaseAmount: true,
      additionalCost: true,
    },
  });

  let totalFee = toNumber(totalsAggregate._sum.trainerBaseAmount) + toNumber(totalsAggregate._sum.additionalCost);

  return {
    items: decoratedItems,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total: totalItems,
      totalPages: Math.ceil(totalItems / pageSize) || 1,
    },
    totals: {
      fee: totalFee,
    },
  };
};
