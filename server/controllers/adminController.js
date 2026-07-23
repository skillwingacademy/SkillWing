const User = require('../models/User');
const Classroom = require('../models/Classroom');
const Session = require('../models/Session');

// @desc    Get all pending teachers
// @route   GET /api/admin/teachers/pending
// @access  Private/Admin
const getPendingTeachers = async (req, res) => {
  try {
    const pendingTeachers = await User.find({
      role: 'teacher',
      approvalStatus: 'pending',
    })
      .select('-password')
      .populate('intendedCourse', 'title');

    res.status(200).json({
      success: true,
      count: pendingTeachers.length,
      data: pendingTeachers,
    });
  } catch (error) {
    console.error('Error fetching pending teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get all classrooms
// @route   GET /api/admin/classrooms
// @access  Private/Admin
const getAllClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.find({})
      .populate('enrolledStudents', 'name profile.avatarUrl')
      .populate('teacher', 'name profile.avatarUrl profile.bio profile.qualifications profile.yearsOfExperience profile.schoolOrCollege')
      .populate('course', 'title thumbnailImage');

    res.status(200).json({
      success: true,
      count: classrooms.length,
      data: classrooms,
    });
  } catch (error) {
    console.error('Error fetching all classrooms:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Approve a teacher
// @route   PUT /api/admin/teachers/:id/approve
// @access  Private/Admin
const approveTeacher = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    if (user.role !== 'teacher') {
      return res.status(400).json({
        success: false,
        message: 'User is not a teacher',
      });
    }

    user.approvalStatus = 'approved';
    await user.save();

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error approving teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Reject a teacher
// @route   PUT /api/admin/teachers/:id/reject
// @access  Private/Admin
const rejectTeacher = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    if (user.role !== 'teacher') {
      return res.status(400).json({
        success: false,
        message: 'User is not a teacher',
      });
    }

    user.approvalStatus = 'rejected';
    await user.save();

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error rejecting teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get all approved teachers
// @route   GET /api/admin/teachers/approved
// @access  Private/Admin
const getApprovedTeachers = async (req, res) => {
  try {
    const approvedTeachers = await User.find({
      role: 'teacher',
      approvalStatus: 'approved',
    }).select('-password');

    res.status(200).json({
      success: true,
      data: approvedTeachers,
    });
  } catch (error) {
    console.error('Error fetching approved teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Update a teacher's per-class rate
// @route   PATCH /api/admin/teachers/:id/rate
// @access  Private/Admin
const updateTeacherRate = async (req, res) => {
  try {
    const { rate } = req.body;
    if (typeof rate !== 'number' || rate < 0) {
      return res.status(400).json({ success: false, message: 'Invalid rate' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    if (user.role !== 'teacher') {
      return res.status(400).json({ success: false, message: 'User is not a teacher' });
    }

    user.profile = user.profile || {};
    user.profile.perClassRate = rate;
    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating teacher rate:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private/Admin
const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
    })
      .select('-password')
      .populate('enrolledCourses', 'title');

    res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get classroom statistics
// @route   GET /api/admin/stats/classrooms
// @access  Private/Admin
const getClassroomStats = async (req, res) => {
  try {
    const total = await Classroom.countDocuments();
    const active = await Classroom.countDocuments({ status: 'active' });
    const completed = await Classroom.countDocuments({ status: 'completed' });
    const paused = await Classroom.countDocuments({ status: 'paused' });

    // Revenue
    const revenueResult = await Classroom.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: '$amountPaid' } } },
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    res.status(200).json({
      success: true,
      data: { total, active, completed, paused, totalRevenue },
    });
  } catch (error) {
    console.error('getClassroomStats error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get session statistics
// @route   GET /api/admin/stats/sessions
// @access  Private/Admin
const getSessionStats = async (req, res) => {
  try {
    const total = await Session.countDocuments();
    const scheduled = await Session.countDocuments({ status: 'scheduled' });
    const completed = await Session.countDocuments({ status: 'completed' });
    const cancelled = await Session.countDocuments({ status: 'cancelled' });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaySessions = await Session.countDocuments({
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      status: 'scheduled',
    });

    res.status(200).json({
      success: true,
      data: { total, scheduled, completed, cancelled, todaySessions },
    });
  } catch (error) {
    console.error('getSessionStats error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get teacher workload (classrooms per teacher)
// @route   GET /api/admin/stats/teacher-workload
// @access  Private/Admin
const getTeacherWorkload = async (req, res) => {
  try {
    const workload = await Classroom.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$teacher', activeClassrooms: { $sum: 1 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      { $unwind: '$teacher' },
      {
        $project: {
          _id: 0,
          teacherId: '$_id',
          name: '$teacher.name',
          email: '$teacher.email',
          activeClassrooms: 1,
        },
      },
      { $sort: { activeClassrooms: -1 } },
    ]);

    res.status(200).json({ success: true, data: workload });
  } catch (error) {
    console.error('getTeacherWorkload error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getPendingTeachers,
  getAllClassrooms,
  approveTeacher,
  rejectTeacher,
  getApprovedTeachers,
  getAllStudents,
  getClassroomStats,
  getSessionStats,
  getTeacherWorkload,
  updateTeacherRate,
};

