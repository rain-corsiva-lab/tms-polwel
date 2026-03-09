import cron from 'node-cron';
import prisma from '../lib/prisma';
import { courseRunWorkflowService } from '../services/courseRunWorkflowService';

// ── Cron schedule: always every 5 minutes in all environments ─────────────
// The billing TRANSITION RULE differs by mode (see courseRunWorkflowService):
//   WORKFLOW_TESTING_MODE=true  → transition 5 min after endDatetime  (staging/local)
//   Default (production)        → transition at midnight after end date
//
// You can still override the cron schedule directly via COURSE_RUN_STATUS_CRON.
// ────────────────────────────────────────────────────────────────────────────
const isTestingMode = process.env.WORKFLOW_TESTING_MODE === 'true';
const DEFAULT_CRON = process.env.COURSE_RUN_STATUS_CRON || '*/5 * * * *'; // Every 5 minutes in all envs
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
  const modeLabel = isTestingMode
    ? '🧪 TESTING MODE (5-min cycle, 5-min delay after end time)'
    : '🏭 PRODUCTION MODE (5-min cycle, midnight transition)';
  console.log(`⏱️  Course run status job scheduled (${DEFAULT_CRON}, timezone: ${DEFAULT_TIMEZONE}) — ${modeLabel}`);
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
