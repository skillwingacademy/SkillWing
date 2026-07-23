const Classroom = require('../models/Classroom');
const Session = require('../models/Session');
const { updateClassroomAttendanceStats } = require('../services/ClassroomService');

// @desc    Get student's active classrooms
// @route   GET /api/student/classrooms
// @access  Private (student)
const getStudentClassrooms = async (req, res) => {
  try {
    let classrooms = await Classroom.find({
      enrolledStudents: req.user.id,
      status: { $in: ['active', 'paused', 'pending_assignment'] },
    })
      .populate('teacher', 'name email profile.avatarUrl profile.bio profile.qualifications profile.yearsOfExperience')
      .populate('course', 'title thumbnailImage courseDetails description')
      .sort({ createdAt: -1 });

    let updatedAny = false;
    for (const c of classrooms) {
      // Skip attendance stat updates for pending_assignment classrooms (no sessions yet)
      if (c.status === 'pending_assignment') continue;
      if (!c.studentAttendanceStats || c.studentAttendanceStats.length === 0) {
        await updateClassroomAttendanceStats(c._id);
        updatedAny = true;
      }
    }

    if (updatedAny) {
      classrooms = await Classroom.find({
        enrolledStudents: req.user.id,
        status: { $in: ['active', 'paused', 'pending_assignment'] },
      })
        .populate('teacher', 'name email profile.avatarUrl profile.bio profile.qualifications profile.yearsOfExperience')
        .populate('course', 'title thumbnailImage courseDetails description')
        .sort({ createdAt: -1 });
    }

    res.status(200).json({ success: true, data: classrooms });
  } catch (error) {
    console.error('getStudentClassrooms error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get the next upcoming class across all classrooms
// @route   GET /api/student/upcoming-class
// @access  Private (student)
const getUpcomingClass = async (req, res) => {
  try {
    const classrooms = await Classroom.find({
      enrolledStudents: req.user.id,
      status: 'active',
    }).select('_id');

    const classroomIds = classrooms.map((c) => c._id);

    const upcoming = await Session.findOne({
      classroom: { $in: classroomIds },
      status: 'scheduled',
      startTime: { $gte: new Date() },
    })
      .sort({ startTime: 1 })
      .populate({
        path: 'classroom',
        populate: [
          { path: 'teacher', select: 'name profile.avatarUrl' },
          { path: 'course', select: 'title' },
        ],
      });

    res.status(200).json({ success: true, data: upcoming });
  } catch (error) {
    console.error('getUpcomingClass error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get today's classes for the student
// @route   GET /api/student/today-class
// @access  Private (student)
const getTodayClasses = async (req, res) => {
  try {
    const classrooms = await Classroom.find({
      enrolledStudents: req.user.id,
      status: 'active',
    }).select('_id');

    const classroomIds = classrooms.map((c) => c._id);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await Session.find({
      classroom: { $in: classroomIds },
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['scheduled', 'rescheduled'] },
    })
      .sort({ startTime: 1 })
      .populate({
        path: 'classroom',
        populate: [
          { path: 'teacher', select: 'name profile.avatarUrl' },
          { path: 'course', select: 'title' },
        ],
      });

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error('getTodayClasses error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get past/completed classes for the student
// @route   GET /api/student/past-classes
// @access  Private (student)
const getPastClasses = async (req, res) => {
  try {
    const classrooms = await Classroom.find({
      enrolledStudents: req.user.id,
    }).select('_id');

    const classroomIds = classrooms.map((c) => c._id);

    const sessions = await Session.find({
      classroom: { $in: classroomIds },
      status: { $in: ['completed', 'cancelled', 'missed'] },
    })
      .sort({ scheduledDate: -1 })
      .limit(20)
      .populate({
        path: 'classroom',
        populate: [
          { path: 'teacher', select: 'name profile.avatarUrl' },
          { path: 'course', select: 'title' },
        ],
      });

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error('getPastClasses error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get progress summary across all classrooms
// @route   GET /api/student/progress
// @access  Private (student)
const getProgress = async (req, res) => {
  try {
    const classrooms = await Classroom.find({ enrolledStudents: req.user.id })
      .populate('course', 'title thumbnailImage')
      .populate('teacher', 'name profile.avatarUrl');

    const active = classrooms.filter((c) => c.status === 'active');
    const completed = classrooms.filter((c) => c.status === 'completed');

    const totalCompleted = classrooms.reduce((sum, c) => sum + c.completedSessions, 0);
    const totalAll = classrooms.reduce((sum, c) => sum + c.totalSessions, 0);

    res.status(200).json({
      success: true,
      data: {
        classrooms,
        stats: {
          totalClassrooms: classrooms.length,
          activeClassrooms: active.length,
          completedClassrooms: completed.length,
          totalSessionsCompleted: totalCompleted,
          totalSessionsAll: totalAll,
          overallProgress: totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error('getProgress error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getStudentClassrooms,
  getUpcomingClass,
  getTodayClasses,
  getPastClasses,
  getProgress,
};
