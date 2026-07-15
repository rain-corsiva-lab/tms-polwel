import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Get date string in YYYY-MM-DD format
function getLocalDateString(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const getDuplicateCourseRuns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const runs = await prisma.courseRun.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        courseId: true,
        serialNumber: true,
        startDatetime: true,
        status: true,
        createdAt: true,
        course: {
          select: {
            title: true,
            courseCode: true,
          },
        },
        _count: {
          select: {
            courseRunLearners: true,
          },
        },
      },
    });

    // Group in memory by courseId and start date
    const groupsMap = new Map<string, any>();

    runs.forEach((run) => {
      if (!run.courseId || !run.startDatetime) return;
      const dateStr = getLocalDateString(run.startDatetime);
      if (!dateStr) return;

      const groupKey = `${run.courseId}_${dateStr}`;
      const runInfo = {
        id: run.id,
        courseRunCode: run.serialNumber || 'N/A',
        status: run.status,
        createdAt: run.createdAt,
        learnerCount: run._count.courseRunLearners,
      };

      if (groupsMap.has(groupKey)) {
        const existing = groupsMap.get(groupKey);
        existing.runs.push(runInfo);
        existing.learnerCount += runInfo.learnerCount;
      } else {
        groupsMap.set(groupKey, {
          courseId: run.courseId,
          courseName: run.course?.title || 'Untitled Course',
          courseCode: run.course?.courseCode || 'N/A',
          startDate: dateStr,
          learnerCount: runInfo.learnerCount,
          runs: [runInfo],
        });
      }
    });

    // Filter groups to only keep duplicate groups (runs.length > 1)
    const duplicateGroups = Array.from(groupsMap.values()).filter(
      (group) => group.runs.length > 1
    );

    return res.json({
      success: true,
      count: duplicateGroups.length,
      groups: duplicateGroups,
    });
  } catch (error) {
    console.error('Error scanning duplicate course runs:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const mergeDuplicateCourseRuns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const runs = await prisma.courseRun.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        courseId: true,
        startDatetime: true,
        createdAt: true,
      },
    });

    // Reconstruct groups map to process them in transaction
    const groupsMap = new Map<string, string[]>();

    runs.forEach((run) => {
      if (!run.courseId || !run.startDatetime) return;
      const dateStr = getLocalDateString(run.startDatetime);
      if (!dateStr) return;

      const groupKey = `${run.courseId}_${dateStr}`;
      if (groupsMap.has(groupKey)) {
        groupsMap.get(groupKey)!.push(run.id);
      } else {
        groupsMap.set(groupKey, [run.id]);
      }
    });

    const duplicateGroups = Array.from(groupsMap.entries())
      .filter(([_, ids]) => ids.length > 1)
      .map(([_, ids]) => ids);

    if (duplicateGroups.length === 0) {
      return res.json({
        success: true,
        message: 'No duplicates detected.',
        mergedGroups: 0,
        deletedCount: 0,
      });
    }

    let mergedGroups = 0;
    let deletedCount = 0;
    let enrollmentsShifted = 0;
    let enrollmentsDeleted = 0;

    // Run all merges inside a single transaction with extended timeout (60 seconds)
    await prisma.$transaction(async (tx) => {
      for (const runIds of duplicateGroups) {
        // Fetch runs in this group ordered by createdAt ascending to determine primary
        const groupRuns = await tx.courseRun.findMany({
          where: { id: { in: runIds } },
          orderBy: { createdAt: 'asc' },
        });

        const primaryRun = groupRuns[0];
        if (!primaryRun) continue;
        const secondaryRuns = groupRuns.slice(1);

        for (const duplicateRun of secondaryRuns) {
          // 1. Move/merge enrollments (CourseRunLearner)
          const enrollments = await tx.courseRunLearner.findMany({
            where: { courseRunId: duplicateRun.id, deletedAt: null },
          });

          for (const enrollment of enrollments) {
            // Check if learner already enrolled in primary run
            const primaryEnrollment = await tx.courseRunLearner.findFirst({
              where: {
                courseRunId: primaryRun.id,
                learnerId: enrollment.learnerId,
                deletedAt: null,
              },
            });

            if (primaryEnrollment) {
              // Duplicate enrollment: merge attendance records to primary run/enrollment and delete duplicate enrollment
              const secondaryAttendance = await tx.courseRunLearnerAttendance.findMany({
                where: { courseRunId: duplicateRun.id, learnerId: enrollment.learnerId },
              });

              const primaryAttendance = await tx.courseRunLearnerAttendance.findMany({
                where: { courseRunId: primaryRun.id, learnerId: enrollment.learnerId },
              });

              const primaryDays = new Set(primaryAttendance.map((a) => a.day));

              for (const att of secondaryAttendance) {
                if (primaryDays.has(att.day)) {
                  // Conflict: keep primary, delete secondary
                  await tx.courseRunLearnerAttendance.delete({
                    where: { id: att.id },
                  });
                } else {
                  // No conflict: shift to primary
                  await tx.courseRunLearnerAttendance.update({
                    where: { id: att.id },
                    data: { courseRunId: primaryRun.id },
                  });
                }
              }

              // Shift confirmation email histories to primary enrollment
              await tx.confirmationEmailHistory.updateMany({
                where: { courseRunId: duplicateRun.id, courseRunLearnersId: enrollment.id },
                data: {
                  courseRunId: primaryRun.id,
                  courseRunLearnersId: primaryEnrollment.id,
                },
              });

              // Delete the duplicate enrollment
              await tx.courseRunLearner.delete({
                where: { id: enrollment.id },
              });
              enrollmentsDeleted++;
            } else {
              // Unique enrollment: shift cleanly to primary run
              await tx.courseRunLearner.update({
                where: { id: enrollment.id },
                data: { courseRunId: primaryRun.id },
              });

              // Update any attendance records for this learner on the run
              await tx.courseRunLearnerAttendance.updateMany({
                where: { courseRunId: duplicateRun.id, learnerId: enrollment.learnerId },
                data: { courseRunId: primaryRun.id },
              });

              // Update confirmation email history
              await tx.confirmationEmailHistory.updateMany({
                where: { courseRunId: duplicateRun.id, courseRunLearnersId: enrollment.id },
                data: { courseRunId: primaryRun.id },
              });

              enrollmentsShifted++;
            }
          }

          // 2. Move bookings
          await tx.booking.updateMany({
            where: { courseRunId: duplicateRun.id },
            data: { courseRunId: primaryRun.id },
          });

          // 3. Move trainer assignment email history
          await tx.trainerAssignmentEmailHistory.updateMany({
            where: { courseRunId: duplicateRun.id },
            data: { courseRunId: primaryRun.id },
          });

          // 4. Move cancellation attachments
          await tx.courseRunCancellationAttachment.updateMany({
            where: { courseRunId: duplicateRun.id },
            data: { courseRunId: primaryRun.id },
          });

          // 5. Move/merge course run trainers
          const trainers = await tx.courseRunTrainer.findMany({
            where: { courseRunId: duplicateRun.id },
          });

          for (const assignment of trainers) {
            const primaryAssignment = await tx.courseRunTrainer.findUnique({
              where: {
                courseRunId_trainerId: {
                  courseRunId: primaryRun.id,
                  trainerId: assignment.trainerId,
                },
              },
            });

            if (primaryAssignment) {
              await tx.courseRunTrainer.delete({
                where: { id: assignment.id },
              });
            } else {
              await tx.courseRunTrainer.update({
                where: { id: assignment.id },
                data: { courseRunId: primaryRun.id },
              });
            }
          }

          // 6. Move/merge course run partners
          const partners = await tx.courseRunPartner.findMany({
            where: { courseRunId: duplicateRun.id },
          });

          for (const assignment of partners) {
            const primaryAssignment = await tx.courseRunPartner.findUnique({
              where: {
                courseRunId_partnerId: {
                  courseRunId: primaryRun.id,
                  partnerId: assignment.partnerId,
                },
              },
            });

            if (primaryAssignment) {
              await tx.courseRunPartner.delete({
                where: { id: assignment.id },
              });
            } else {
              await tx.courseRunPartner.update({
                where: { id: assignment.id },
                data: { courseRunId: primaryRun.id },
              });
            }
          }

          // 7. Move/merge course run billings
          const duplicateBilling = await tx.courseRunBilling.findUnique({
            where: { courseRunId: duplicateRun.id },
          });

          if (duplicateBilling) {
            const primaryBilling = await tx.courseRunBilling.findUnique({
              where: { courseRunId: primaryRun.id },
            });

            if (primaryBilling) {
              // Move billing entries to primary billing
              await tx.courseRunBillingEntry.updateMany({
                where: { courseRunBillingId: duplicateBilling.id },
                data: { courseRunBillingId: primaryBilling.id },
              });
              // Delete duplicate billing record
              await tx.courseRunBilling.delete({
                where: { id: duplicateBilling.id },
              });
            } else {
              // Shift the billing record to primary run
              await tx.courseRunBilling.update({
                where: { id: duplicateBilling.id },
                data: { courseRunId: primaryRun.id },
              });
            }
          }

          // 8. Delete secondary course run
          await tx.courseRun.delete({
            where: { id: duplicateRun.id },
          });

          deletedCount++;
        }
        mergedGroups++;
      }
    }, {
      maxWait: 60000,
      timeout: 60000
    });

    return res.json({
      success: true,
      message: `Successfully merged duplicates.`,
      mergedGroups,
      deletedCount,
      enrollmentsShifted,
      enrollmentsDeleted,
    });
  } catch (error) {
    console.error('Error merging duplicate course runs:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during merge',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
