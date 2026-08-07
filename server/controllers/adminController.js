const User = require('../models/User');
const Classroom = require('../models/Classroom');
const Session = require('../models/Session');
const TeacherRateConfig = require('../models/TeacherRateConfig');
const ChatContact = require('../models/ChatContact');

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
      .populate('enrolledStudents', 'name email phoneNumber profile.avatarUrl isArchived createdAt')
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

// @desc    Get teacher rate configuration matrix
// @route   GET /api/admin/teacher-rates
// @access  Private/Admin
const getTeacherRateConfig = async (req, res) => {
  try {
    const config = await TeacherRateConfig.getConfig();
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error('getTeacherRateConfig error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update teacher rate configuration matrix
// @route   PUT /api/admin/teacher-rates
// @access  Private/Admin
const updateTeacherRateConfig = async (req, res) => {
  try {
    const { Junior, Senior, Master } = req.body;
    let config = await TeacherRateConfig.findOne();
    if (!config) {
      config = new TeacherRateConfig();
    }
    if (Junior) config.Junior = { ...config.Junior, ...Junior };
    if (Senior) config.Senior = { ...config.Senior, ...Senior };
    if (Master) config.Master = { ...config.Master, ...Master };
    await config.save();
    res.status(200).json({ success: true, message: 'Payment matrix updated successfully', data: config });
  } catch (error) {
    console.error('updateTeacherRateConfig error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a teacher's level and manually selected per-class rate
// @route   PUT /api/admin/teachers/:id/rate-level
// @access  Private/Admin
const updateTeacherLevelAndRate = async (req, res) => {
  try {
    const { teacherLevel, perClassRate } = req.body;
    const teacher = await User.findById(req.params.id);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    if (teacherLevel && ['Junior', 'Senior', 'Master'].includes(teacherLevel)) {
      teacher.teacherLevel = teacherLevel;
      if (teacher.profile) teacher.profile.teacherLevel = teacherLevel;
    }

    if (perClassRate !== undefined && typeof perClassRate === 'number') {
      teacher.profile = teacher.profile || {};
      teacher.profile.perClassRate = perClassRate;
    }

    await teacher.save();
    res.status(200).json({ success: true, message: 'Teacher level and rate updated successfully', data: teacher });
  } catch (error) {
    console.error('updateTeacherLevelAndRate error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Toggle archive status for a student
// @route   PUT /api/admin/students/:id/archive
// @access  Private/Admin
const archiveStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    student.isArchived = !student.isArchived;
    await student.save();
    res.status(200).json({
      success: true,
      message: student.isArchived ? 'Student archived successfully' : 'Student restored successfully',
      data: student,
    });
  } catch (error) {
    console.error('archiveStudent error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update student basic information
// @route   PUT /api/admin/students/:id
// @access  Private/Admin
const updateStudentInfo = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (name) student.name = name;
    if (email) student.email = email;
    if (phoneNumber !== undefined) student.phoneNumber = phoneNumber;
    await student.save();
    res.status(200).json({ success: true, message: 'Student information updated successfully', data: student });
  } catch (error) {
    console.error('updateStudentInfo error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Permanently delete a student
// @route   DELETE /api/admin/students/:id
// @access  Private/Admin
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Remove student from all enrolled classrooms
    await Classroom.updateMany(
      { enrolledStudents: student._id },
      { $pull: { enrolledStudents: student._id } }
    );

    // Delete student record
    await User.findByIdAndDelete(student._id);

    res.status(200).json({ success: true, message: 'Student permanently deleted successfully' });
  } catch (error) {
    console.error('deleteStudent error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Assign or change instructor for a specific student's classroom
// @route   PUT /api/admin/classrooms/:id/assign-teacher
// @access  Private/Admin
const assignTeacherToClassroom = async (req, res) => {
  try {
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ success: false, message: 'Teacher ID is required' });
    }

    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ success: false, message: 'Invalid teacher account' });
    }
    if (teacher.approvalStatus !== 'approved') {
      return res.status(400).json({ success: false, message: 'Selected teacher is not approved yet' });
    }

    // Update classroom teacher
    classroom.teacher = teacher._id;
    if (classroom.status === 'pending_assignment') {
      classroom.status = 'active';
      classroom.startedAt = new Date();
    }
    await classroom.save();

    // Create chat contacts between assigned teacher and enrolled students
    if (Array.isArray(classroom.enrolledStudents)) {
      for (const studentId of classroom.enrolledStudents) {
        if (studentId) {
          const sid = studentId._id || studentId;
          await ChatContact.updateOne(
            { userId: teacher._id, contactId: sid },
            { $set: { userId: teacher._id, contactId: sid } },
            { upsert: true }
          );
          await ChatContact.updateOne(
            { userId: sid, contactId: teacher._id },
            { $set: { userId: sid, contactId: teacher._id } },
            { upsert: true }
          );
        }
      }
    }

    const updatedClassroom = await Classroom.findById(classroom._id)
      .populate('teacher', 'name email profile.avatarUrl')
      .populate('course', 'title thumbnailImage')
      .populate('enrolledStudents', 'name email profile.avatarUrl');

    res.status(200).json({
      success: true,
      message: 'Instructor assigned to student classroom successfully',
      data: updatedClassroom,
    });
  } catch (error) {
    console.error('assignTeacherToClassroom error:', error);
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
  getTeacherRateConfig,
  updateTeacherRateConfig,
  updateTeacherLevelAndRate,
  archiveStudent,
  updateStudentInfo,
  deleteStudent,
  assignTeacherToClassroom,
};

