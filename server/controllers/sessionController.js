const Session = require('../models/Session');
const Classroom = require('../models/Classroom');
const { completeSession: completeClassroomSession, updateClassroomAttendanceStats } = require('../services/ClassroomService');
const { generateSignedUrl } = require('../services/gcsService');
const { reconcileSession: reconcileSessionFinancials } = require('../services/SessionReconciliationService');

/**
 * Backward-compat helper: normalizes a field that may be a plain string
 * (from old sessions) into the new { content, files } structure.
 */
function normalizeRichField(value) {
  if (!value) return { content: '', files: [] };
  if (typeof value === 'string') return { content: value, files: [] };
  return {
    content: value.content || '',
    files: value.files || [],
  };
}

/**
 * Helper: verify teacher owns the classroom that a session belongs to.
 */
async function verifySessionOwnership(sessionId, userId, role) {
  const session = await Session.findById(sessionId).populate('classroom');
  if (!session) return { error: 'Session not found', status: 404 };
  if (!session.classroom) return { error: 'Classroom not found for this session', status: 404 };

  if (
    role === 'teacher' &&
    session.classroom.teacher.toString() !== userId
  ) {
    return { error: 'Access denied', status: 403 };
  }

  return { session, classroom: session.classroom };
}

// @desc    Get a single session by ID (with role-gated fields)
// @route   GET /api/classrooms/sessions/:id
// @access  Private (student/teacher/admin)
const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('classroom', 'teacher course enrolledStudents')
      .populate('studentAttendance.studentId', 'name profile.avatarUrl');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const classroom = session.classroom;
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    // Check access: must be teacher, admin, or enrolled student
    const userId = req.user.id;
    const role = req.user.role;
    const isTeacher = classroom.teacher.toString() === userId;
    const isAdmin = role === 'admin';
    const isEnrolled = (classroom.enrolledStudents || []).some(
      (s) => s.toString() === userId
    );

    if (!isTeacher && !isAdmin && !isEnrolled) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Build the response — normalize homework/teacherNotes for backward compat
    const sessionObj = session.toObject();
    sessionObj.homework = normalizeRichField(sessionObj.homework);
    
    // Generate signed URLs for homework files
    if (sessionObj.homework.files && sessionObj.homework.files.length > 0) {
      sessionObj.homework.files = await Promise.all(
        sessionObj.homework.files.map(async (f) => ({
          ...f,
          signedUrl: await generateSignedUrl(f.url),
        }))
      );
    }

    sessionObj.teacherNotes = normalizeRichField(sessionObj.teacherNotes);
    if (sessionObj.teacherNotes.files && sessionObj.teacherNotes.files.length > 0) {
      sessionObj.teacherNotes.files = await Promise.all(
        sessionObj.teacherNotes.files.map(async (f) => ({
          ...f,
          signedUrl: await generateSignedUrl(f.url),
        }))
      );
    }

    res.status(200).json({ success: true, data: sessionObj });
  } catch (error) {
    console.error('getSessionById error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a session (title, description, times, meet link, homework, notes)
// @route   PUT /api/sessions/:id
// @access  Private (teacher/admin)
const updateSession = async (req, res) => {
  try {
    const { session, classroom, error, status } = await verifySessionOwnership(
      req.params.id, req.user.id, req.user.role
    );
    if (error) return res.status(status).json({ success: false, message: error });

    const simpleFields = [
      'title', 'description', 'scheduledDate', 'startTime', 'endTime',
      'timezone', 'googleMeetLink', 'joinEnabled', 'recordingLink',
    ];

    simpleFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        session[field] = req.body[field];
      }
    });

    // Handle structured homework field
    if (req.body.homework !== undefined) {
      if (typeof req.body.homework === 'string') {
        // Plain string from old frontend — wrap it
        session.homework = { content: req.body.homework, files: session.homework?.files || [] };
      } else if (typeof req.body.homework === 'object') {
        if (req.body.homework.content !== undefined) {
          session.homework.content = req.body.homework.content;
        }
        // Files are managed via the file upload endpoint, not here
      }
    }

    // Handle structured teacherNotes field
    if (req.body.teacherNotes !== undefined) {
      if (typeof req.body.teacherNotes === 'string') {
        session.teacherNotes = { content: req.body.teacherNotes, files: session.teacherNotes?.files || [] };
      } else if (typeof req.body.teacherNotes === 'object') {
        if (req.body.teacherNotes.content !== undefined) {
          session.teacherNotes.content = req.body.teacherNotes.content;
        }
      }
    }

    // If meet link is added/updated, enable join
    if (req.body.googleMeetLink && req.body.joinEnabled === undefined) {
      session.joinEnabled = true;
    }

    if (req.body.homework !== undefined) session.markModified('homework');
    if (req.body.teacherNotes !== undefined) session.markModified('teacherNotes');
    await session.save();
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error('updateSession error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark a session as completed + update classroom progress
// @route   PATCH /api/sessions/:id/complete
// @access  Private (teacher/admin)
const completeSession = async (req, res) => {
  try {
    const { session, classroom, error, status } = await verifySessionOwnership(
      req.params.id, req.user.id, req.user.role
    );
    if (error) return res.status(status).json({ success: false, message: error });

    if (session.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Session already completed' });
    }

    session.status = 'completed';
    session.meetingStatus = 'completed';

    // Optional teacher attendance from body
    if (req.body.teacherAttendance) session.teacherAttendance = req.body.teacherAttendance;
    if (req.body.teacherNotes) session.teacherNotes = req.body.teacherNotes;
    if (req.body.homework) session.homework = req.body.homework;

    // Handle multi-student attendance if provided as array
    if (req.body.studentAttendance && Array.isArray(req.body.studentAttendance)) {
      for (const entry of req.body.studentAttendance) {
        const existing = session.studentAttendance.find(
          (sa) => sa.studentId.toString() === entry.studentId
        );
        if (existing) {
          existing.attendanceStatus = entry.attendanceStatus;
        } else {
          session.studentAttendance.push({
            studentId: entry.studentId,
            attendanceStatus: entry.attendanceStatus,
          });
        }
      }
    }

    if (req.body.homework) session.markModified('homework');
    if (req.body.teacherNotes) session.markModified('teacherNotes');
    await session.save();

    // Reconcile financials based on telemetry
    await reconcileSessionFinancials(session._id);

    // Update classroom progress
    await completeClassroomSession(classroom._id);
    const updatedClassroom = await updateClassroomAttendanceStats(classroom._id);

    // Re-fetch session with updated financials
    const reconciledSession = await Session.findById(session._id);

    res.status(200).json({
      success: true,
      data: { session: reconciledSession, classroom: updatedClassroom },
    });
  } catch (error) {
    console.error('completeSession error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Cancel a session
// @route   PATCH /api/sessions/:id/cancel
// @access  Private (teacher/admin)
const cancelSession = async (req, res) => {
  try {
    const { session, error, status } = await verifySessionOwnership(
      req.params.id, req.user.id, req.user.role
    );
    if (error) return res.status(status).json({ success: false, message: error });

    if (session.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: 'Only scheduled sessions can be cancelled' });
    }

    if (!req.body.cancellationReason) {
      return res.status(400).json({ success: false, message: 'Cancellation reason is required' });
    }

    session.status = 'cancelled';
    session.cancellationReason = req.body.cancellationReason;
    await session.save();

    // Reconcile financials — evaluates LMC penalty
    await reconcileSessionFinancials(session._id);
    const reconciledSession = await Session.findById(session._id);

    res.status(200).json({ success: true, data: reconciledSession });
  } catch (error) {
    console.error('cancelSession error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reschedule a session (creates a new one linked to the old)
// @route   PATCH /api/sessions/:id/reschedule
// @access  Private (teacher/admin)
const rescheduleSession = async (req, res) => {
  try {
    const { session, classroom, error, status } = await verifySessionOwnership(
      req.params.id, req.user.id, req.user.role
    );
    if (error) return res.status(status).json({ success: false, message: error });

    const { scheduledDate, startTime, endTime, googleMeetLink } = req.body;

    if (!scheduledDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'New date, start time, and end time are required',
      });
    }

    // Update session dates and time
    session.scheduledDate = new Date(scheduledDate);
    session.startTime = new Date(startTime);
    session.endTime = new Date(endTime);
    
    if (googleMeetLink !== undefined) {
      session.googleMeetLink = googleMeetLink;
      session.joinEnabled = !!googleMeetLink;
    }

    // Reset meeting and attendance status in case it was modified
    session.meetingStatus = 'pending';
    if (session.studentAttendance && session.studentAttendance.length > 0) {
      session.studentAttendance.forEach(sa => {
        sa.attendanceStatus = 'pending';
      });
    }

    await session.save();

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error('rescheduleSession error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark attendance for a specific student in a session
// @route   PATCH /api/sessions/:id/attendance
// @access  Private (teacher/admin)
const markAttendance = async (req, res) => {
  try {
    const { session, error, status } = await verifySessionOwnership(
      req.params.id, req.user.id, req.user.role
    );
    if (error) return res.status(status).json({ success: false, message: error });

    if (req.body.teacherAttendance) {
      session.teacherAttendance = req.body.teacherAttendance;
      if (req.body.teacherAttendance === 'present' && !session.teacherJoinedAt) {
        session.teacherJoinedAt = new Date();
      }
      // Telemetry: record actual teacher join time for payroll
      if (req.body.teacherAttendance === 'present' && !session.actualTeacherJoinTime) {
        session.actualTeacherJoinTime = new Date();
      }
    }

    // Multi-student attendance: accept { studentId, attendanceStatus }
    if (req.body.studentId && req.body.attendanceStatus) {
      const entry = session.studentAttendance.find(
        (sa) => sa.studentId.toString() === req.body.studentId
      );
      if (entry) {
        entry.attendanceStatus = req.body.attendanceStatus;
      } else {
        session.studentAttendance.push({
          studentId: req.body.studentId,
          attendanceStatus: req.body.attendanceStatus,
        });
      }
      // Telemetry: record actual student join time for payroll
      if (req.body.attendanceStatus === 'present' && !session.actualStudentJoinTime) {
        session.actualStudentJoinTime = new Date();
      }
    }

    await session.save();
    await updateClassroomAttendanceStats(session.classroom);

    // Re-populate for the response
    const populatedSession = await Session.findById(session._id)
      .populate('studentAttendance.studentId', 'name profile.avatarUrl');

    res.status(200).json({ success: true, data: populatedSession });
  } catch (error) {
    console.error('markAttendance error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getSessionById,
  updateSession,
  completeSession,
  cancelSession,
  rescheduleSession,
  markAttendance,
};
