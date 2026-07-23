const Session = require('../models/Session');
const {
  LATE_PENALTY,
  NOSHOW_PENALTY,
  LMC_PENALTY,
  LATE_THRESHOLD_MINS,
  STUDENT_WAIT_MINS,
  LMC_THRESHOLD_HOURS,
} = require('../config/payrollConfig');

/**
 * Reconcile a session's financial data based on telemetry and status.
 * Called after session completion or cancellation.
 *
 * Rules (applied in priority order):
 *  1. Teacher No-Show — teacher never joined → NOSHOW penalty
 *  2. Student No-Show Exemption — teacher joined, waited ≥20 min, no student → full pay
 *  3. Teacher Late — teacher joined >5 min after startTime → LATE penalty
 *  4. LMC — session cancelled <4 hours before start → LMC penalty
 *  5. Default — normal completion → full pay, no penalty
 */
async function reconcileSession(sessionId) {
  const session = await Session.findById(sessionId);
  if (!session) {
    console.warn(`reconcileSession: Session ${sessionId} not found`);
    return null;
  }

  const rate = session.snapshotRate || 0;
  const now = new Date();

  // Initialize financials
  let earnedAmount = 0;
  let penaltyAmount = 0;
  let penaltyType = 'none';

  // ── CANCELLED sessions — check for LMC ──────────────────
  if (session.status === 'cancelled') {
    const cancelledAt = session.updatedAt || now;
    const startTime = new Date(session.startTime);
    const hoursBeforeClass = (startTime.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

    if (hoursBeforeClass < LMC_THRESHOLD_HOURS) {
      // Late Minute Cancellation — within 4 hours of class
      penaltyAmount = LMC_PENALTY;
      penaltyType = 'lmc';
      earnedAmount = 0;
    }
    // Cancellation with enough notice — no penalty, no pay
    session.financials = {
      earnedAmount,
      penaltyAmount,
      penaltyType,
      finalPayout: earnedAmount - penaltyAmount,
    };
    session.markModified('financials');
    await session.save();
    return session;
  }

  // ── COMPLETED sessions ──────────────────────────────────
  if (session.status === 'completed') {
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);

    // Rule 1: Teacher No-Show — never joined at all
    if (!session.actualTeacherJoinTime) {
      // Only flag as no-show if the session end time has passed
      if (now >= endTime) {
        session.isNoShow = true;
        earnedAmount = 0;
        penaltyAmount = NOSHOW_PENALTY;
        penaltyType = 'noshow';

        session.financials = {
          earnedAmount,
          penaltyAmount,
          penaltyType,
          finalPayout: earnedAmount - penaltyAmount,
        };
        session.markModified('financials');
        await session.save();
        return session;
      }
    }

    // From here, teacher did join
    const teacherJoinTime = new Date(session.actualTeacherJoinTime);

    // Rule 2: Student No-Show Exemption
    if (!session.actualStudentJoinTime) {
      // Teacher joined but no student ever did
      const teacherWaitMs = now.getTime() - startTime.getTime();
      const teacherWaitMins = teacherWaitMs / (1000 * 60);

      if (teacherWaitMins >= STUDENT_WAIT_MINS) {
        session.studentNoShowExempt = true;
        earnedAmount = rate;
        penaltyAmount = 0;
        penaltyType = 'none';

        session.financials = {
          earnedAmount,
          penaltyAmount,
          penaltyType,
          finalPayout: rate,
        };
        session.markModified('financials');
        await session.save();
        return session;
      }
    }

    // Rule 3: Teacher Late — joined >5 min after start
    const lateThresholdMs = LATE_THRESHOLD_MINS * 60 * 1000;
    if (teacherJoinTime.getTime() > startTime.getTime() + lateThresholdMs) {
      session.isTeacherLate = true;
      earnedAmount = rate;
      penaltyAmount = LATE_PENALTY;
      penaltyType = 'late';

      session.financials = {
        earnedAmount,
        penaltyAmount,
        penaltyType,
        finalPayout: rate - LATE_PENALTY,
      };
      session.markModified('financials');
      await session.save();
      return session;
    }

    // Rule 5: Default — normal completed session, no issues
    earnedAmount = rate;
    penaltyAmount = 0;
    penaltyType = 'none';

    session.financials = {
      earnedAmount,
      penaltyAmount,
      penaltyType,
      finalPayout: rate,
    };
    session.markModified('financials');
    await session.save();
    return session;
  }

  // For other statuses, don't modify financials
  return session;
}

module.exports = { reconcileSession };
