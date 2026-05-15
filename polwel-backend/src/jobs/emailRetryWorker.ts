/**
 * emailRetryWorker.ts
 *
 * Background worker that polls email_retry_queue every 30 seconds and
 * retries failed email sends.
 *
 * Retry policy:
 *   - Interval between retries: 3 minutes (RETRY_DELAY_MS in emailQueueService)
 *   - Maximum total attempts:   10 (MAX_ATTEMPTS in emailQueueService)
 *   - Poll interval:            30 seconds (fine-grained enough to hit 3-min windows)
 *
 * The worker runs in-process alongside the Express server.
 * It is started once by calling startEmailRetryWorker() from index.ts.
 */

import cron from 'node-cron';
import { processDueRetries } from '../services/emailQueueService';

let _started = false;

/**
 * Start the email retry worker.
 * Safe to call multiple times — only starts once.
 */
export function startEmailRetryWorker(): void {
  if (_started) return;
  _started = true;

  // Poll every 30 seconds: "*/30 * * * * *" (6-field cron with seconds)
  // node-cron supports 6-field schedules when the "scheduled" option is true.
  cron.schedule(
    '*/30 * * * * *',   // every 30 seconds
    async () => {
      try {
        await processDueRetries();
      } catch (err) {
        console.error('[EmailRetryWorker] Unhandled error in processDueRetries:', (err as any)?.message);
      }
    },
    { scheduled: true, timezone: process.env.APP_TIMEZONE || 'Asia/Singapore' },
  );

  console.log('📬 Email retry worker started (polling every 30 s, retries every 3 min, max 10 attempts).');
}
