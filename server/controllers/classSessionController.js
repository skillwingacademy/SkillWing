const ClassSession = require('../models/ClassSession');
const Course = require('../models/Course');

// @desc    Get sessions for a course
// @route   GET /api/sessions/course/:courseId
// @access  Private
const getSessionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const sessions = await ClassSession.find({ courseId }).sort({ startTime: 1 });

    // Check if the requesting user is a course teacher (educator or in instructors array)
    const isTeacher =
      (course.educator && course.educator.toString() === req.user.id) ||
      (course.instructors && course.instructors.some((i) => i.toString() === req.user.id));

    if (isTeacher) {
      // Teachers see everything
      return res.status(200).json({
        success: true,
        data: sessions,
      });
    }

    // For enrolled students: conditionally show meetLink
    const now = new Date();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;

    const filteredSessions = sessions.map((session) => {
      const sessionObj = session.toObject();
      const startTime = new Date(sessionObj.startTime);
      const endTime = new Date(sessionObj.endTime);

      // Show meetLink only if:
      //   1. isLinkVisible is true, AND
      //   2. We are within 15 minutes of start time OR currently live
      const isWithin15Min = startTime - now <= FIFTEEN_MINUTES && now <= endTime;
      const shouldShowLink = sessionObj.isLinkVisible && isWithin15Min;

      if (!shouldShowLink) {
        sessionObj.meetLink = '';
      }

      return sessionObj;
    });

    res.status(200).json({
      success: true,
      data: filteredSessions,
    });
  } catch (error) {
    console.error('GetSessionsByCourse error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sessions',
    });
  }
};

// @desc    Create a new session
// @route   POST /api/sessions
// @access  Private (teacher, admin)
const createSession = async (req, res) => {
  try {
    const { courseId, title, startTime, endTime, meetLink } = req.body;

    // Validate required fields
    if (!courseId || !title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide courseId, title, startTime, and endTime',
      });
    }

    // Verify the teacher owns the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    if (
      !(course.educator && course.educator.toString() === req.user.id) &&
      !(course.instructors && course.instructors.some((i) => i.toString() === req.user.id)) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create sessions for this course',
      });
    }

    const session = await ClassSession.create({
      courseId,
      title,
      startTime,
      endTime,
      meetLink: meetLink || '',
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('CreateSession error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error creating session',
    });
  }
};

// @desc    Update a session (title, times)
// @route   PUT /api/sessions/:id
// @access  Private (teacher, admin)
const updateSession = async (req, res) => {
  try {
    const session = await ClassSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Verify ownership of parent course
    const course = await Course.findById(session.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Parent course not found',
      });
    }

    if (
      !(course.educator && course.educator.toString() === req.user.id) &&
      !(course.instructors && course.instructors.some((i) => i.toString() === req.user.id)) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update sessions for this course',
      });
    }

    const { title, startTime, endTime } = req.body;

    if (title !== undefined) session.title = title;
    if (startTime !== undefined) session.startTime = startTime;
    if (endTime !== undefined) session.endTime = endTime;

    const updatedSession = await session.save();

    res.status(200).json({
      success: true,
      data: updatedSession,
    });
  } catch (error) {
    console.error('UpdateSession error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating session',
    });
  }
};

// @desc    Update meetLink and isLinkVisible on a session
// @route   PATCH /api/sessions/:id/meet-link
// @access  Private (teacher, admin)
const updateMeetLink = async (req, res) => {
  try {
    const session = await ClassSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Verify ownership of parent course
    const course = await Course.findById(session.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Parent course not found',
      });
    }

    if (
      !(course.educator && course.educator.toString() === req.user.id) &&
      !(course.instructors && course.instructors.some((i) => i.toString() === req.user.id)) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update meet link for this course',
      });
    }

    const { meetLink, isLinkVisible } = req.body;

    if (meetLink !== undefined) session.meetLink = meetLink;
    if (isLinkVisible !== undefined) session.isLinkVisible = isLinkVisible;

    const updatedSession = await session.save();

    res.status(200).json({
      success: true,
      data: updatedSession,
    });
  } catch (error) {
    console.error('UpdateMeetLink error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating meet link',
    });
  }
};

// @desc    Get all sessions for courses the teacher teaches
// @route   GET /api/sessions/teacher/schedule
// @access  Private (teacher, admin)
const getTeacherSchedule = async (req, res) => {
  try {
    // Find all courses the teacher owns (educator or in instructors)
    const courses = await Course.find({
      $or: [
        { educator: req.user.id },
        { instructors: req.user.id },
      ],
    }).select('_id');
    const courseIds = courses.map((c) => c._id);

    // Find all sessions for those courses, sorted by startTime
    const sessions = await ClassSession.find({ courseId: { $in: courseIds } })
      .sort({ startTime: 1 })
      .populate('courseId', 'title');

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('GetTeacherSchedule error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching teacher schedule',
    });
  }
};

module.exports = {
  getSessionsByCourse,
  createSession,
  updateSession,
  updateMeetLink,
  getTeacherSchedule,
};
