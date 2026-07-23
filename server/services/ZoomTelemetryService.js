const axios = require('axios');
const Session = require('../models/Session');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const { getAccessToken } = require('./ZoomService');
const { reconcileSession } = require('./SessionReconciliationService');

/**
 * Fetch participant list from Zoom's Report API.
 * Requires Zoom Pro or higher plan.
 *
 * GRACEFUL DEGRADATION: If the account isn't Pro or the API fails,
 * this returns an empty array instead of crashing.
 *
 * @param {string} meetingId  Zoom numeric meeting ID
 * @returns {Array<{ user_name, user_email, join_time, leave_time, duration }>}
 */
async function fetchMeetingParticipants(meetingId) {
  try {
    const token = await getAccessToken();
    const allParticipants = [];
    let nextPageToken = '';

    do {
      const url = `https://api.zoom.us/v2/report/meetings/${meetingId}/participants`;
      const params = { page_size: 300, type: 'past' };
      if (nextPageToken) params.next_page_token = nextPageToken;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params,
      });

      const participants = (response.data.participants || []).map((p) => ({
        user_name: p.user_name || p.name || '',
        user_email: (p.user_email || p.email || '').toLowerCase(),
        join_time: p.join_time,
        leave_time: p.leave_time,
        duration: p.duration || 0,
      }));

      allParticipants.push(...participants);
      nextPageToken = response.data.next_page_token || '';
    } while (nextPageToken);

    return allParticipants;
  } catch (error) {
    // Graceful degradation — don't crash the app
    const status = error.response?.status;
    const zoomMsg = error.response?.data?.message || error.message;

    if (status === 400 || status === 404) {
      // Meeting not found or not yet available
      console.warn(`[ZoomTelemetry] Meeting ${meetingId} not available yet (${status}): ${zoomMsg}`);
    } else if (status === 403 || status === 401) {
      // Insufficient plan or permissions
      console.warn(`[ZoomTelemetry] Zoom API access denied for meeting ${meetingId} (${status}). This feature requires a Pro or higher Zoom plan. Skipping.`);
    } else if (status === 429) {
      console.warn(`[ZoomTelemetry] Zoom API rate limited. Will retry on next cron cycle.`);
    } else {
      console.error(`[ZoomTelemetry] Unexpected error fetching participants for meeting ${meetingId}:`, zoomMsg);
    }

    return [];
  }
}

/**
 * Match Zoom participants to platform users (teacher / students).
 *
 * Strategy:
 *  1. Email match (most reliable — works when participants join with Zoom account)
 *  2. Name match (fallback — works for guest participants)
 *
 * @param {Array} participants  Zoom participant list
 * @param {Object} teacher      User document (teacher)
 * @param {Array}  students     Array of User documents (enrolled students)
 * @returns {{ teacherParticipant, studentParticipant }}
 */
function matchParticipants(participants, teacher, students) {
  let teacherParticipant = null;
  let studentParticipant = null;

  const teacherEmail = (teacher?.email || '').toLowerCase();
  const teacherName = (teacher?.name || '').toLowerCase();

  // Build student lookup maps
  const studentEmails = new Set();
  const studentNames = new Set();
  for (const s of students) {
    if (s.email) studentEmails.add(s.email.toLowerCase());
    if (s.name) studentNames.add(s.name.toLowerCase());
  }

  for (const p of participants) {
    const pEmail = (p.user_email || '').toLowerCase();
    const pName = (p.user_name || '').toLowerCase();

    // Match teacher — email first, name fallback
    if (!teacherParticipant) {
      if (pEmail && pEmail === teacherEmail) {
        teacherParticipant = p;
        continue;
      }
      if (pName && pName === teacherName) {
        teacherParticipant = p;
        continue;
      }
    }

    // Match student — email first, name fallback
    if (!studentParticipant) {
      if (pEmail && studentEmails.has(pEmail)) {
        studentParticipant = p;
        continue;
      }
      if (pName && studentNames.has(pName)) {
        studentParticipant = p;
        continue;
      }
    }

    // If both matched, stop early
    if (teacherParticipant && studentParticipant) break;
  }

  return { teacherParticipant, studentParticipant };
}

/**
 * Poll Zoom for participant data and reconcile a session's financials.
 *
 * 1. Fetches participants from Zoom Report API
 * 2. Matches them to platform teacher + students
 * 3. Sets actualTeacherJoinTime and actualStudentJoinTime
 * 4. Stores raw telemetry for audit
 * 5. Runs the payroll reconciliation engine
 *
 * @param {string} sessionId  MongoDB session ID
 * @returns {Object|null}  Reconciled session or null on failure
 */
async function pollAndReconcileSession(sessionId) {
  try {
    const session = await Session.findById(sessionId);
    if (!session) {
      console.warn(`[ZoomTelemetry] Session ${sessionId} not found`);
      return null;
    }

    if (!session.zoomMeetingId) {
      console.warn(`[ZoomTelemetry] Session ${sessionId} has no zoomMeetingId, skipping`);
      return null;
    }

    // Fetch participants from Zoom
    const participants = await fetchMeetingParticipants(session.zoomMeetingId);

    // If no participants returned (API error, non-Pro plan, etc.), mark as polled but skip reconciliation
    if (participants.length === 0) {
      console.log(`[ZoomTelemetry] No participants returned for session ${sessionId} (meeting ${session.zoomMeetingId}). Marking as polled.`);
      session.zoomTelemetry = {
        ...(session.zoomTelemetry || {}),
        totalParticipants: 0,
        polledAt: new Date(),
        rawParticipants: [],
      };
      session.markModified('zoomTelemetry');
      await session.save();

      // Still run reconciliation — it will use whatever telemetry is already available
      // (e.g., manually set attendance)
      return await reconcileSession(sessionId);
    }

    // Load classroom with teacher and students
    const classroom = await Classroom.findById(session.classroom);
    if (!classroom) {
      console.warn(`[ZoomTelemetry] Classroom not found for session ${sessionId}`);
      return null;
    }

    const teacher = await User.findById(classroom.teacher).select('name email');
    const students = await User.find({
      _id: { $in: classroom.enrolledStudents || [] },
    }).select('name email');

    // Match participants to roles
    const { teacherParticipant, studentParticipant } = matchParticipants(
      participants,
      teacher,
      students
    );

    // Set telemetry timestamps from Zoom data
    if (teacherParticipant && teacherParticipant.join_time) {
      session.actualTeacherJoinTime = new Date(teacherParticipant.join_time);
    }
    if (studentParticipant && studentParticipant.join_time) {
      session.actualStudentJoinTime = new Date(studentParticipant.join_time);
    }

    // Store full Zoom telemetry for audit trail
    session.zoomTelemetry = {
      teacherJoinTime: teacherParticipant ? new Date(teacherParticipant.join_time) : undefined,
      teacherLeaveTime: teacherParticipant ? new Date(teacherParticipant.leave_time) : undefined,
      studentJoinTime: studentParticipant ? new Date(studentParticipant.join_time) : undefined,
      studentLeaveTime: studentParticipant ? new Date(studentParticipant.leave_time) : undefined,
      totalParticipants: participants.length,
      polledAt: new Date(),
      rawParticipants: participants,
    };

    session.markModified('zoomTelemetry');
    await session.save();

    console.log(
      `[ZoomTelemetry] Session ${sessionId}: ` +
      `${participants.length} participants, ` +
      `teacher=${teacherParticipant ? 'matched' : 'NOT matched'}, ` +
      `student=${studentParticipant ? 'matched' : 'NOT matched'}`
    );

    // Run payroll reconciliation with the real Zoom data
    return await reconcileSession(sessionId);
  } catch (error) {
    console.error(`[ZoomTelemetry] Error polling session ${sessionId}:`, error.message);
    return null;
  }
}

module.exports = { fetchMeetingParticipants, matchParticipants, pollAndReconcileSession };
