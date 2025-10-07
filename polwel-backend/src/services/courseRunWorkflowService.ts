import { PrismaClient, Prisma, CourseStatus, CourseRunType, LearnerEmailStatus, ConfirmationEmailStatus } from '@prisma/client';
import EmailService from './emailService';

export type CourseRunWorkflowAction =
  | 'SUBMIT'
  | 'APPROVE'
  | 'READY_FOR_EMAILS'
  | 'MARK_EMAILS_SENT'
  | 'START'
  | 'COMPLETE'
  | 'ARCHIVE'
  | 'RESET_TO_DRAFT';

export class CourseRunWorkflowError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CourseRunWorkflowError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

interface WorkflowActionDefinition {
  key: CourseRunWorkflowAction;
  label: string;
  description: string;
  from: CourseStatus[];
  to: CourseStatus;
  requiresLearnerEmails?: boolean;
  updateLearnerEmailStatus?: LearnerEmailStatus;
}

export interface WorkflowActionSummary {
  key: CourseRunWorkflowAction;
  label: string;
  targetStatus: CourseStatus;
  description: string;
  requiresLearnerEmails: boolean;
}

export interface LearnerEmailReport {
  attempted: number;
  succeeded: number;
  failed: Array<{ learnerId: string; learnerName: string; email?: string | null; reason: string }>;
}

const DEFAULT_STATUS_BY_TYPE: Partial<Record<CourseRunType, CourseStatus>> = {
  OPEN: 'PUBLISHED',
  DEDICATED: 'PENDING',
  TALKS: 'PENDING',
  CUSTOMIZED: 'DRAFT',
};

const WORKFLOW_ACTIONS: Record<CourseRunWorkflowAction, WorkflowActionDefinition> = {
  SUBMIT: {
    key: 'SUBMIT',
    label: 'Submit for Approval',
    description: 'Move the draft run into the approval queue.',
    from: ['DRAFT'],
    to: 'PENDING',
  },
  APPROVE: {
    key: 'APPROVE',
    label: 'Approve Run',
    description: 'Approve this run and mark it as confirmed.',
    from: ['PENDING', 'CONFIRMED_PENDING_TA_APPROVAL'],
    to: 'CONFIRMED',
  },
  READY_FOR_EMAILS: {
    key: 'READY_FOR_EMAILS',
    label: 'Prepare Learner Emails',
    description: 'Mark run as ready to send learner confirmation emails.',
    from: ['CONFIRMED'],
    to: 'CONFIRMED_PENDING_CONFIRMATION_EMAILS',
    updateLearnerEmailStatus: 'PENDING',
  },
  MARK_EMAILS_SENT: {
    key: 'MARK_EMAILS_SENT',
    label: 'Send Learner Emails',
    description: 'Send learner confirmation emails and activate the course run.',
    from: ['CONFIRMED_PENDING_CONFIRMATION_EMAILS'],
    to: 'ACTIVE',
    requiresLearnerEmails: true,
  },
  START: {
    key: 'START',
    label: 'Start Run',
    description: 'Mark the course run as in progress.',
    from: ['CONFIRMED', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS', 'ACTIVE', 'PUBLISHED'],
    to: 'IN_PROGRESS',
  },
  COMPLETE: {
    key: 'COMPLETE',
    label: 'Complete Run',
    description: 'Confirm that the run has completed successfully.',
    from: ['IN_PROGRESS'],
    to: 'COMPLETED',
  },
  ARCHIVE: {
    key: 'ARCHIVE',
    label: 'Archive Run',
    description: 'Archive the run once all activities are concluded.',
    from: ['COMPLETED', 'CANCELLED'],
    to: 'ARCHIVED',
  },
  RESET_TO_DRAFT: {
    key: 'RESET_TO_DRAFT',
    label: 'Revert to Draft',
    description: 'Return the run to draft for further editing.',
    from: ['PENDING'],
    to: 'DRAFT',
  },
};

const loadCourseRunWithRelations = async (
  prisma: PrismaClient,
  courseRunId: string
): Promise<Prisma.CourseRunGetPayload<{
  include: {
    course: { select: { id: true; title: true; courseCode: true } };
    venue: { select: { id: true; name: true; address: true } };
    courseRunLearners: {
      where: { deletedAt: null };
      include: {
        learner: {
          select: {
            id: true;
            fullname: true;
            email: true;
            contact: true;
            departmentName: true;
          };
        };
      };
    };
  };
}>> => {
  const courseRun = await prisma.courseRun.findFirst({
    where: { id: courseRunId, deletedAt: null },
    include: {
      course: { select: { id: true, title: true, courseCode: true } },
      venue: { select: { id: true, name: true, address: true } },
      courseRunLearners: {
        where: { deletedAt: null },
        include: {
          learner: {
            select: {
              id: true,
              fullname: true,
              email: true,
              contact: true,
              departmentName: true,
            },
          },
        },
      },
    },
  });

  if (!courseRun) {
    throw new CourseRunWorkflowError('Course run not found or has been deleted.', 'COURSE_RUN_NOT_FOUND');
  }

  return courseRun;
};

export const courseRunWorkflowService = {
  determineDefaultStatus(courseRunType?: CourseRunType | null): CourseStatus {
    return DEFAULT_STATUS_BY_TYPE[courseRunType as CourseRunType] ?? 'DRAFT';
  },

  getAvailableActions(courseRun: {
    status: CourseStatus;
    learnerEmailStatus: LearnerEmailStatus;
    startDatetime: Date | null;
    endDatetime: Date | null;
    deletedAt: Date | null;
  }): WorkflowActionSummary[] {
    if (courseRun.deletedAt) {
      return [];
    }

    return Object.values(WORKFLOW_ACTIONS)
      .filter((action) => action.from.includes(courseRun.status))
      .map((action) => ({
        key: action.key,
        label: action.label,
        targetStatus: action.to,
        description: action.description,
        requiresLearnerEmails: Boolean(action.requiresLearnerEmails),
      }));
  },

  async performAction(
    prisma: PrismaClient,
    params: {
      courseRunId: string;
      action: CourseRunWorkflowAction;
      actorId: string;
      sendEmails?: boolean;
    }
  ) {
    const { courseRunId, action, sendEmails = true } = params;
    const definition = WORKFLOW_ACTIONS[action];

    if (!definition) {
      throw new CourseRunWorkflowError(`Unsupported workflow action: ${action}`, 'WORKFLOW_ACTION_UNSUPPORTED');
    }

    const courseRun = await loadCourseRunWithRelations(prisma, courseRunId);

    if (!definition.from.includes(courseRun.status)) {
      throw new CourseRunWorkflowError(
        `Cannot perform action "${definition.label}" while run is ${courseRun.status}.`,
        'WORKFLOW_ACTION_INVALID_STATE',
        {
          currentStatus: courseRun.status,
          action,
        }
      );
    }

    const now = new Date();

    if (action === 'MARK_EMAILS_SENT') {
      const enrolledLearners = courseRun.courseRunLearners.filter((learner) =>
        ['ENROLLED'].includes(String(learner.enrollmentStatus || 'ENROLLED'))
      );

      if (enrolledLearners.length === 0) {
        throw new CourseRunWorkflowError(
          'There are no enrolled learners to email.',
          'WORKFLOW_NO_LEARNERS'
        );
      }

      if (!sendEmails) {
        await prisma.courseRun.update({
          where: { id: courseRunId },
          data: {
            status: definition.to,
            statusLastEvaluatedAt: now,
            learnerEmailStatus: LearnerEmailStatus.SENT,
            learnerEmailStatusUpdatedAt: now,
          },
        });

        return {
          courseRun: await loadCourseRunWithRelations(prisma, courseRunId),
          action: {
            key: definition.key,
            label: definition.label,
            targetStatus: definition.to,
            description: definition.description,
            requiresLearnerEmails: Boolean(definition.requiresLearnerEmails),
          },
          emailReport: {
            attempted: 0,
            succeeded: 0,
            failed: [],
          } satisfies LearnerEmailReport,
        };
      }

      await prisma.courseRun.update({
        where: { id: courseRunId },
        data: {
          learnerEmailStatus: LearnerEmailStatus.IN_PROGRESS,
          learnerEmailStatusUpdatedAt: now,
        },
      });

      await prisma.courseRunLearner.updateMany({
        where: {
          courseRunId,
          id: {
            in: enrolledLearners.map((enrollment) => enrollment.id),
          },
        },
        data: {
          confirmationEmailStatus: ConfirmationEmailStatus.SENDING,
          confirmationEmailLastSentAt: now,
        },
      });

      const failures: LearnerEmailReport['failed'] = [];
      let success = 0;

      for (const enrollment of enrolledLearners) {
        const learner = enrollment.learner;
        const email = learner?.email?.trim();

        if (!email) {
          failures.push({
            learnerId: learner?.id || enrollment.id,
            learnerName: learner?.fullname || 'Unknown learner',
            email: email || null,
            reason: 'No email address available',
          });
          continue;
        }

        try {
          const emailPayload: Parameters<typeof EmailService.sendLearnerCourseConfirmationEmail>[0] = {
            email,
            learnerName: learner?.fullname || 'Learner',
            courseTitle: courseRun.course?.title || 'POLWEL Course',
          };

          if (courseRun.course?.courseCode) {
            emailPayload.courseCode = courseRun.course.courseCode;
          } else if (courseRun.serialNumber) {
            emailPayload.courseCode = courseRun.serialNumber;
          }

          if (courseRun.serialNumber) {
            emailPayload.serialNumber = courseRun.serialNumber;
          }

          if (courseRun.startDatetime) {
            emailPayload.startDate = new Date(courseRun.startDatetime);
          }

          if (courseRun.endDatetime) {
            emailPayload.endDate = new Date(courseRun.endDatetime);
          }

          const venueName = courseRun.venue?.name || courseRun.specifiedLocation;
          if (venueName) {
            emailPayload.venueName = venueName;
          }

          const didSend = await EmailService.sendLearnerCourseConfirmationEmail(emailPayload);

          if (didSend) {
            success += 1;
            await prisma.courseRunLearner.update({
              where: { id: enrollment.id },
              data: {
                confirmationEmailStatus: ConfirmationEmailStatus.SENT,
                confirmationEmailLastSentAt: new Date(),
              },
            });
          } else {
            failures.push({
              learnerId: learner?.id || enrollment.id,
              learnerName: learner?.fullname || 'Learner',
              email,
              reason: 'Email service reported failure',
            });
            await prisma.courseRunLearner.update({
              where: { id: enrollment.id },
              data: {
                confirmationEmailStatus: ConfirmationEmailStatus.FAILED,
                confirmationEmailLastSentAt: new Date(),
              },
            });
          }
        } catch (error) {
          failures.push({
            learnerId: learner?.id || enrollment.id,
            learnerName: learner?.fullname || 'Learner',
            email,
            reason: (error as Error).message || 'Unknown error',
          });
          await prisma.courseRunLearner.update({
            where: { id: enrollment.id },
            data: {
              confirmationEmailStatus: ConfirmationEmailStatus.FAILED,
              confirmationEmailLastSentAt: new Date(),
            },
          });
        }
      }

      if (failures.length === 0) {
        await prisma.courseRun.update({
          where: { id: courseRunId },
          data: {
            status: definition.to,
            statusLastEvaluatedAt: new Date(),
            learnerEmailStatus: LearnerEmailStatus.SENT,
            learnerEmailStatusUpdatedAt: new Date(),
          },
        });
      } else {
        await prisma.courseRun.update({
          where: { id: courseRunId },
          data: {
            learnerEmailStatus: LearnerEmailStatus.FAILED,
            learnerEmailStatusUpdatedAt: new Date(),
          },
        });

        throw new CourseRunWorkflowError(
          'Failed to deliver some learner confirmation emails.',
          'WORKFLOW_EMAIL_FAILED',
          {
            failedCount: failures.length,
            total: enrolledLearners.length,
            failures,
          }
        );
      }

      return {
        courseRun: await loadCourseRunWithRelations(prisma, courseRunId),
        action: {
          key: definition.key,
          label: definition.label,
          targetStatus: definition.to,
          description: definition.description,
          requiresLearnerEmails: Boolean(definition.requiresLearnerEmails),
        },
        emailReport: {
          attempted: enrolledLearners.length,
          succeeded: success,
          failed: failures,
        },
      };
    }

    const updateData: Prisma.CourseRunUpdateInput = {
      status: definition.to,
      statusLastEvaluatedAt: now,
    };

    if (definition.updateLearnerEmailStatus) {
      updateData.learnerEmailStatus = definition.updateLearnerEmailStatus;
      updateData.learnerEmailStatusUpdatedAt = now;
    }

    await prisma.courseRun.update({
      where: { id: courseRunId },
      data: updateData,
    });

    return {
      courseRun: await loadCourseRunWithRelations(prisma, courseRunId),
      action: {
        key: definition.key,
        label: definition.label,
        targetStatus: definition.to,
        description: definition.description,
        requiresLearnerEmails: Boolean(definition.requiresLearnerEmails),
      },
    };
  },

  async evaluateStatuses(prisma: PrismaClient) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Transition CONFIRMED-like statuses to IN_PROGRESS when start datetime is reached
    const started = await prisma.courseRun.updateMany({
      where: {
        deletedAt: null,
        startDatetime: {
          lte: now,
        },
        endDatetime: {
          gte: now, // Not yet ended
        },
        status: {
          in: ['CONFIRMED', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS', 'ACTIVE', 'PUBLISHED'],
        },
      },
      data: {
        status: 'IN_PROGRESS',
        statusLastEvaluatedAt: now,
      },
    });

    // Transition IN_PROGRESS to PENDING_BILLING when end datetime + 1 day has passed
    const pendingBilling = await prisma.courseRun.updateMany({
      where: {
        deletedAt: null,
        endDatetime: {
          lt: oneDayAgo, // More than 1 day after end
        },
        status: 'IN_PROGRESS',
      },
      data: {
        status: 'PENDING_BILLING',
        statusLastEvaluatedAt: now,
      },
    });

    // Legacy: Keep completed transition for older statuses (if needed)
    const completed = await prisma.courseRun.updateMany({
      where: {
        deletedAt: null,
        endDatetime: {
          lt: oneDayAgo,
        },
        status: {
          in: ['CONFIRMED', 'ACTIVE', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS'],
        },
      },
      data: {
        status: 'COMPLETED',
        statusLastEvaluatedAt: now,
      },
    });

    return {
      started: started.count,
      pendingBilling: pendingBilling.count,
      completed: completed.count,
      evaluatedAt: now,
    };
  },
};
