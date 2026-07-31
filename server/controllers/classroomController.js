const Classroom = require('../models/Classroom');
const Session = require('../models/Session');
const { updateClassroomAttendanceStats } = require('../services/ClassroomService');

// @desc    Get all classrooms assigned to the authenticated teacher
// @route   GET /api/classrooms/teacher
// @access  Private (teacher)
const getTeacherClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.find({ teacher: req.user.id })
      .populate('enrolledStudents', 'name email profile.avatarUrl profile.bio profile.schoolOrCollege')
      .populate('course', 'title thumbnailImage courseDetails')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: classrooms });
  } catch (error) {
    console.error('getTeacherClassrooms error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get a single classroom by ID (teacher must own it)
// @route   GET /api/classrooms/:id
// @access  Private (teacher/admin)
const getClassroomById = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate('enrolledStudents', 'name email profile.avatarUrl profile.phoneNumber')
      .populate('teacher', 'name email profile.avatarUrl')
      .populate('course', 'title description thumbnailImage courseDetails price currency pricing');

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    // Security: teacher can only see their own classrooms
    if (
      req.user.role === 'teacher' &&
      classroom.teacher &&
      classroom.teacher._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Security: student must be enrolled
    if (
      req.user.role === 'student' &&
      !classroom.enrolledStudents.some(s => s && (s._id ? s._id.toString() : s.toString()) === req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Fetch sessions for this classroom
    const sessions = await Session.find({ classroom: classroom._id })
      .populate('studentAttendance.studentId', 'name profile.avatarUrl')
      .sort({ sessionNumber: 1 });

    res.status(200).json({
      success: true,
      data: { classroom, sessions },
    });
  } catch (error) {
    console.error('getClassroomById error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a session for a classroom
// @route   POST /api/classrooms/:id/sessions
// @access  Private (teacher)
const createSession = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    // Verify ownership
    if (
      req.user.role === 'teacher' &&
      classroom.teacher.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (classroom.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add sessions to a non-active classroom',
      });
    }

    const { title, description, scheduledDate, startTime, endTime, timezone, googleMeetLink } = req.body;

    if (!title || !scheduledDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, scheduled date, start time, and end time are required',
      });
    }

    // Validate endTime > startTime
    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time',
      });
    }

    // Prevent overlapping sessions in the same classroom
    const overlap = await Session.findOne({
      classroom: classroom._id,
      status: { $in: ['scheduled', 'rescheduled'] },
      $or: [
        {
          startTime: { $lt: new Date(endTime) },
          endTime: { $gt: new Date(startTime) },
        },
      ],
    });

    if (overlap) {
      return res.status(400).json({
        success: false,
        message: `Time overlaps with session #${overlap.sessionNumber} (${overlap.title})`,
      });
    }

    const sessionNumber = classroom.nextSessionNumber;

    // Build initial studentAttendance array from all enrolled students
    const studentAttendance = classroom.enrolledStudents.map((studentId) => ({
      studentId,
      attendanceStatus: 'pending',
    }));

    const session = await Session.create({
      classroom: classroom._id,
      sessionNumber,
      title,
      description: description || '',
      scheduledDate: new Date(scheduledDate),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      timezone: timezone || 'Asia/Kolkata',
      googleMeetLink: googleMeetLink || '',
      joinEnabled: !!googleMeetLink,
      status: 'scheduled',
      meetingStatus: 'pending',
      createdBy: req.user.id,
      studentAttendance,
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('createSession error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get classroom details with deep dive sessions (accessible by student and teacher)
// @route   GET /api/classrooms/:id/details
// @access  Private (teacher/student/admin)
const getClassroomDetails = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate('enrolledStudents', 'name email profile.avatarUrl')
      .populate('teacher', 'name email profile.avatarUrl')
      .populate('course', 'title description thumbnailImage courseDetails');

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    // Security: Student must be enrolled
    if (
      req.user.role === 'student' &&
      !classroom.enrolledStudents.some(s => s && (s._id ? s._id.toString() : s.toString()) === req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (
      req.user.role === 'teacher' &&
      classroom.teacher &&
      classroom.teacher._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Auto-migrate or update stats if empty
    if (!classroom.studentAttendanceStats || classroom.studentAttendanceStats.length === 0) {
      await updateClassroomAttendanceStats(classroom._id);
      classroom.studentAttendanceStats = (await Classroom.findById(classroom._id)).studentAttendanceStats;
    }

    // Fetch sessions for this classroom chronologically
    const sessions = await Session.find({ classroom: classroom._id })
      .populate('studentAttendance.studentId', 'name profile.avatarUrl')
      .sort({ scheduledDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      data: { classroom, sessions },
    });
  } catch (error) {
    console.error('getClassroomDetails error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getTeacherClassrooms, getClassroomById, createSession, getClassroomDetails };
