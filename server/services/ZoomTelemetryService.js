const axios = require('axios');
const Session = require('../models/Session');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const { getAccessToken } = require('./ZoomService');
const { reconcileSession } = require('./SessionReconciliationService');

class ZoomTelemetryError extends Error {
  constructor(message, { retryable, status } = {}) {
    super(message);
    this.name = 'ZoomTelemetryError';
    this.retryable = retryable;
    this.status = status;
  }
}

/**
 * Fetch participant list from Zoom's Report API.
 * Requires Zoom Pro or higher plan.
 *
 * Throws a typed error on API failure so callers never mistake a failed
 * request for an attended meeting with zero participants.
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
    const status = error.response?.status;
    const zoomMsg = error.response?.data?.message || error.message;

    if (status === 400 || status === 404) {
      // Meeting not found or not yet available
      console.warn(`[ZoomTelemetry] Meeting ${meetingId} not available yet (${status}): ${zoomMsg}`);
    } else if (status === 403 || status === 401) {
      // Insufficient plan or permissions
      console.warn(`[ZoomTelemetry] Zoom API access denied for meeting ${meetingId} (${status}). This feature requires a Pro plan and Report API scope.`);
    } else if (status === 429) {
      console.warn(`[ZoomTelemetry] Zoom API rate limited. Will retry on next cron cycle.`);
    } else {
      console.error(`[ZoomTelemetry] Unexpected error fetching participants for meeting ${meetingId}:`, zoomMsg);
    }

    throw new ZoomTelemetryError(zoomMsg, {
      // A missing report can become available later; authorization errors need configuration.
      retryable: status !== 401 && status !== 403,
      status,
    });
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
 * @returns {{ teacherParticipant, studentParticipant, studentParticipants }}
 */
function matchParticipants(participants, teacher, students) {
  let teacherParticipant = null;
  let studentParticipant = null;

  const teacherEmail = (teacher?.email || '').toLowerCase();
  const teacherName = (teacher?.name || '').toLowerCase();

  // Build student lookup maps
  const studentByEmail = new Map();
  const studentByName = new Map();
  for (const s of students) {
    if (s.email) studentByEmail.set(s.email.toLowerCase(), s);
    if (s.name) studentByName.set(s.name.toLowerCase(), s);
  }
  const matchedStudents = new Map();

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
    const student = (pEmail && studentByEmail.get(pEmail)) || (pName && studentByName.get(pName));
    if (student) {
      const studentId = student._id.toString();
      const existing = matchedStudents.get(studentId);
      // Keep the earliest join record when a participant reconnects.
      if (!existing || new Date(p.join_time) < new Date(existing.participant.join_time)) {
        matchedStudents.set(studentId, { student, participant: p });
      }
      if (!studentParticipant) studentParticipant = p;
    }

    // If both matched, stop early
    if (teacherParticipant && matchedStudents.size === students.length) break;
  }

  return {
    teacherParticipant,
    studentParticipant,
    studentParticipants: [...matchedStudents.values()].map(({ student, participant }) => ({
      studentId: student._id,
      participant,
    })),
  };
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

    // A successful zero-participant report is a valid final result.
    if (participants.length === 0) {
      console.log(`[ZoomTelemetry] No participants returned for session ${sessionId} (meeting ${session.zoomMeetingId}). Marking as polled.`);
      session.zoomTelemetry = {
        ...(session.zoomTelemetry || {}),
        totalParticipants: 0,
        pollStatus: 'success',
        polledAt: new Date(),
        lastAttemptAt: new Date(),
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
    const { teacherParticipant, studentParticipants } = matchParticipants(
      participants,
      teacher,
      students
    );
    const primaryStudentParticipant = studentParticipants
      .map(({ participant }) => participant)
      .sort((a, b) => new Date(a.join_time) - new Date(b.join_time))[0];

    // Set telemetry timestamps from Zoom data
    if (teacherParticipant && teacherParticipant.join_time) {
      session.actualTeacherJoinTime = new Date(teacherParticipant.join_time);
    }
    if (primaryStudentParticipant && primaryStudentParticipant.join_time) {
      session.actualStudentJoinTime = new Date(primaryStudentParticipant.join_time);
    }

    // Store full Zoom telemetry for audit trail
    session.zoomTelemetry = {
      teacherJoinTime: teacherParticipant ? new Date(teacherParticipant.join_time) : undefined,
      teacherLeaveTime: teacherParticipant ? new Date(teacherParticipant.leave_time) : undefined,
      studentJoinTime: primaryStudentParticipant ? new Date(primaryStudentParticipant.join_time) : undefined,
      studentLeaveTime: primaryStudentParticipant ? new Date(primaryStudentParticipant.leave_time) : undefined,
      totalParticipants: participants.length,
      studentParticipants: studentParticipants.map(({ studentId, participant }) => ({
        studentId,
        joinTime: participant.join_time ? new Date(participant.join_time) : undefined,
        leaveTime: participant.leave_time ? new Date(participant.leave_time) : undefined,
      })),
      pollStatus: 'success',
      polledAt: new Date(),
      lastAttemptAt: new Date(),
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
    if (error instanceof ZoomTelemetryError && sessionId) {
      const session = await Session.findById(sessionId);
      if (session) {
        session.zoomTelemetry = {
          ...(session.zoomTelemetry || {}),
          pollStatus: error.retryable ? 'retry' : 'unsupported',
          lastAttemptAt: new Date(),
          lastError: error.message,
        };
        session.markModified('zoomTelemetry');
        await session.save();
      }
    }
    console.error(`[ZoomTelemetry] Error polling session ${sessionId}:`, error.message);
    return null;
  }
}

module.exports = { fetchMeetingParticipants, matchParticipants, pollAndReconcileSession, ZoomTelemetryError };
