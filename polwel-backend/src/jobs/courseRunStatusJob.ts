import cron from 'node-cron';
import prisma from '../lib/prisma';
import { courseRunWorkflowService } from '../services/courseRunWorkflowService';

// Run hourly to check for status changes (production setting)
const DEFAULT_CRON = process.env.COURSE_RUN_STATUS_CRON || '0 * * * *';
const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Singapore';

export const startCourseRunStatusJob = () => {
  const task = cron.schedule(
    DEFAULT_CRON,
    async () => {
      try {
        const result = await courseRunWorkflowService.evaluateStatuses(prisma);
        if (result.started  || result.pendingBilling) {
          console.log(
            `📅 Course run status job: ${result.started} started, ${result.pendingBilling} pending billing, at ${result.evaluatedAt.toISOString()}`
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
      `📅 Course run status job (manual): ${result.started} started, ${result.pendingBilling} pending billing, at ${result.evaluatedAt.toISOString()}`
    );
    return result;
  } catch (error) {
    console.error('Failed to evaluate course run statuses manually:', error);
    throw error;
  }
};
