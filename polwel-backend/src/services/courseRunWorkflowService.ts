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
  OPEN: 'CONFIRMED',
  DEDICATED: 'PENDING',
  TALKS: 'PENDING',
  CUSTOMIZED: 'DRAFT',
};

const WORKFLOW_ACTIONS: Record<CourseRunWorkflowAction, WorkflowActionDefinition> = {
  SUBMIT: {
    key: 'SUBMIT',
    label: 'Mark as Active',
    description: 'Move the draft run into the approval queue.',
    from: ['DRAFT'],
    to: 'PENDING',
  },
  APPROVE: {
    key: 'APPROVE',
    label: 'Approve Run',
    description: 'Approve this run and mark it as confirmed.',
    from: [],
    to: 'CONFIRMED',
  },
  READY_FOR_EMAILS: {
    key: 'READY_FOR_EMAILS',
    label: 'Prepare Learner Emails',
    description: 'Mark run as ready to send learner confirmation emails.',
    from: [],
    to: 'CONFIRMED_PENDING_CONFIRMATION_EMAILS',
    updateLearnerEmailStatus: 'PENDING',
  },
  MARK_EMAILS_SENT: {
    key: 'MARK_EMAILS_SENT',
    label: 'Send Learner Emails',
    description: 'Send learner confirmation emails and activate the course run.',
    from: [],
    to: 'ACTIVE',
    requiresLearnerEmails: true,
  },
  START: {
    key: 'START',
    label: 'Start Run',
    description: 'Mark the course run as in progress.',
    from: [],
    to: 'IN_PROGRESS',
  },
  COMPLETE: {
    key: 'COMPLETE',
    label: 'Complete Run',
    description: 'Confirm that the run has completed successfully.',
    from: ['CONFIRMED', 'IN_PROGRESS', 'PENDING_BILLING', 'ACTIVE', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS'],
    to: 'COMPLETED',
  },
  ARCHIVE: {
    key: 'ARCHIVE',
    label: 'Archive Run',
    description: 'Archive the run once all activities are concluded.',
    from: [],
    to: 'CANCELLED',
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
    courseRunTrainers: {
      where: { deletedAt: null };
      include: {
        trainer: {
          select: {
            id: true;
            name: true;
            email: true;
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
      courseRunTrainers: {
        where: { deletedAt: null },
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
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

    // Send completion emails when course is marked as COMPLETED
    if (action === 'COMPLETE') {
      const enrolledLearners = courseRun.courseRunLearners.filter((learner) =>
        ['ENROLLED'].includes(String(learner.enrollmentStatus || 'ENROLLED'))
      );

      const baseUrl = process.env.FRONTEND_URL || 'https://tms.polwel.org';

      for (const enrollment of enrolledLearners) {
        const learner = enrollment.learner;
        const email = learner?.email?.trim();

        if (!email) continue;

        try {
          const trainerNames = courseRun.courseRunTrainers
            .map((ct: any) => ct.trainer?.name)
            .filter(Boolean)
            .join(', ');

          const certificateDownloadUrl = `${baseUrl}/api/course-runs/certificates/download/${learner?.id}/${courseRunId}`;

          const emailParams: any = {
            email,
            learnerName: learner?.fullname || 'Learner',
            courseTitle: courseRun.course?.title || 'POLWEL Course',
            certificateDownloadUrl,
          };

          if (courseRun.course?.courseCode) emailParams.courseCode = courseRun.course.courseCode;
          if (courseRun.startDatetime) emailParams.startDate = new Date(courseRun.startDatetime);
          if (courseRun.endDatetime) emailParams.endDate = new Date(courseRun.endDatetime);
          if (trainerNames) emailParams.trainerName = trainerNames;
          if (courseRun.endDatetime) emailParams.completionDate = new Date(courseRun.endDatetime);

          await EmailService.sendCourseCompletionEmail(emailParams);

          console.log(`Sent completion email to ${email}`);
        } catch (error) {
          console.error(`Failed to send completion email to ${email}:`, error);
          // Don't fail the entire completion if email fails
        }
      }
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
    };
  },

  async evaluateStatuses(prisma: PrismaClient) {
    const now = new Date();
    
    // Calculate midnight (00:00) of today
    // This is used to transition IN_PROGRESS to PENDING_BILLING
    // If end date is Dec 19 19:00, it should change to PENDING_BILLING at Dec 20 00:00
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);

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
          in: ['CONFIRMED', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS', 'ACTIVE'],
        },
      },
      data: {
        status: 'IN_PROGRESS',
        statusLastEvaluatedAt: now,
      },
    });

    // Transition IN_PROGRESS to PENDING_BILLING at midnight the day after end date
    // This runs at midnight (00:00) each day, so any course that ended before today's midnight
    // should be transitioned to PENDING_BILLING
    const pendingBilling = await prisma.courseRun.updateMany({
      where: {
        deletedAt: null,
        endDatetime: {
          lt: todayMidnight, // End date is before today's midnight (ended yesterday or earlier)
        },
        status: 'IN_PROGRESS',
      },
      data: {
        status: 'PENDING_BILLING',
        statusLastEvaluatedAt: now,
      },
    });

    // Legacy: Keep completed transition for older statuses (if needed)
    // const completed = await prisma.courseRun.updateMany({
    //   where: {
    //     deletedAt: null,
    //     endDatetime: {
    //       lt: fiveMinutesAgo,
    //     },
    //     status: {
    //       in: ['CONFIRMED', 'ACTIVE', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS'],
    //     },
    //   },
    //   data: {
    //     status: 'COMPLETED',
    //     statusLastEvaluatedAt: now,
    //   },
    // });

    return {
      started: started.count,
      pendingBilling: pendingBilling.count,
      // completed: completed.count,
      evaluatedAt: now,
    };
  },
};
