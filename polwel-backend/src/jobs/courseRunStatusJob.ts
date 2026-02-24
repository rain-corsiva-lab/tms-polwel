import cron from 'node-cron';
import prisma from '../lib/prisma';
import { courseRunWorkflowService } from '../services/courseRunWorkflowService';

// Runs every hour at minute 0 (e.g. 00:00, 01:00, 02:00 …)
// At the 00:00 run each day the workflow engine transitions IN_PROGRESS → PENDING_BILLING
// for all courses whose end date was before today's midnight.
const DEFAULT_CRON = process.env.COURSE_RUN_STATUS_CRON || '0 * * * *'; // Every hour
const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Singapore';

export const startCourseRunStatusJob = () => {
  const task = cron.schedule(
    DEFAULT_CRON,
    async () => {
      try {
        const result = await courseRunWorkflowService.evaluateStatuses(prisma);
        if (result.incompleted || result.started || result.pendingBilling) {
          console.log(
            `📅 Course run status job: ${result.incompleted} incompleted, ${result.started} started, ${result.pendingBilling} pending billing, at ${result.evaluatedAt.toISOString()}`
          );
        }
      } catch (error) {
        console.error('Failed to evaluate course run statuses via cron job:', error);
      }
    },
    {
      timezone: DEFAULT_TIMEZONE,
    }
  );

  task.start();
  console.log(`⏱️  Course run status job scheduled (${DEFAULT_CRON}, timezone: ${DEFAULT_TIMEZONE})`);
  return task;
};

export const evaluateCourseRunStatusesNow = async () => {
  try {
    const result = await courseRunWorkflowService.evaluateStatuses(prisma);
    console.log(
      `📅 Course run status job (manual): ${result.incompleted} incompleted, ${result.started} started, ${result.pendingBilling} pending billing, at ${result.evaluatedAt.toISOString()}`
    );
    return result;
  } catch (error) {
    console.error('Failed to evaluate course run statuses manually:', error);
    throw error;
  }
};
