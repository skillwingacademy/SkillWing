const cron = require('node-cron');
const Session = require('../models/Session');
const { pollAndReconcileSession } = require('../services/ZoomTelemetryService');

/**
 * Zoom Telemetry Scheduler
 *
 * Runs every 5 minutes and finds completed sessions that:
 *  1. Have a zoomMeetingId (Zoom link was generated)
 *  2. Ended 10+ minutes ago (data availability buffer)
 *  3. Haven't been polled yet (no zoomTelemetry.polledAt)
 *
 * For each matching session, polls Zoom's Report API for participant
 * join/leave times and reconciles the session's financials.
 *
 * GRACEFUL: If Zoom is unavailable or the plan is insufficient,
 * individual sessions are logged and skipped — never crashes the app.
 */

let isRunning = false;

async function runTelemetryPoll() {
  // Prevent overlapping runs
  if (isRunning) {
    console.log('[ZoomScheduler] Previous poll still running, skipping this cycle');
    return;
  }

  isRunning = true;

  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Find sessions ready for telemetry polling
    const sessions = await Session.find({
      status: 'completed',
      zoomMeetingId: { $ne: '' },
      endTime: { $lte: tenMinutesAgo },
      'zoomTelemetry.polledAt': { $exists: false },
    })
      .select('_id zoomMeetingId sessionNumber title')
      .limit(20); // Process max 20 per cycle to avoid Zoom rate limits

    if (sessions.length === 0) {
      // No sessions to poll — silent return
      isRunning = false;
      return;
    }

    console.log(`[ZoomScheduler] Found ${sessions.length} sessions to poll for Zoom telemetry`);

    for (const session of sessions) {
      try {
        console.log(`[ZoomScheduler] Polling session ${session._id} (Meeting: ${session.zoomMeetingId})`);
        await pollAndReconcileSession(session._id);

        // Small delay between API calls to respect Zoom rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        // Log and continue — don't let one session failure stop the batch
        console.error(`[ZoomScheduler] Failed to poll session ${session._id}:`, err.message);
      }
    }

    console.log(`[ZoomScheduler] Completed polling cycle for ${sessions.length} sessions`);
  } catch (error) {
    console.error('[ZoomScheduler] Error in telemetry poll cycle:', error.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the cron scheduler.
 * Runs every 5 minutes. Safe to call multiple times (idempotent).
 */
function startZoomTelemetryScheduler() {
  try {
    // Validate cron is available
    if (!cron || !cron.schedule) {
      console.warn('[ZoomScheduler] node-cron not available. Zoom telemetry polling disabled.');
      return;
    }
    // Changed 5 to 30 for now
    cron.schedule('*/30 * * * *', runTelemetryPoll, {
      scheduled: true,
      timezone: 'Asia/Kolkata',
    });

    console.log('[ZoomScheduler] ✓ Zoom telemetry scheduler started (every 5 minutes)');
  } catch (error) {
    // Never crash the app if scheduler fails to start
    console.error('[ZoomScheduler] Failed to start scheduler:', error.message);
    console.warn('[ZoomScheduler] The app will continue running without automatic Zoom telemetry polling.');
  }
}

module.exports = { startZoomTelemetryScheduler, runTelemetryPoll };
