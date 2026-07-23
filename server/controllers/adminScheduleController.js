const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const Session = require('../models/Session');
const User = require('../models/User');

// @desc    Assign instructor & bulk-create sessions for a pending classroom
// @route   POST /api/admin/classrooms/:id/schedule-batch
// @access  Private/Admin
const scheduleBatch = async (req, res) => {
  try {
    const { instructorId, scheduleDates } = req.body;

    if (!instructorId || !scheduleDates || !Array.isArray(scheduleDates) || scheduleDates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'instructorId and a non-empty scheduleDates array are required',
      });
    }

    // Find the classroom
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    if (classroom.status !== 'pending_assignment') {
      return res.status(400).json({
        success: false,
        message: `Classroom is already '${classroom.status}'. Only 'pending_assignment' classrooms can be scheduled.`,
      });
    }

    // Validate instructor
    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'teacher') {
      return res.status(400).json({ success: false, message: 'Invalid instructor. Must be a user with teacher role.' });
    }
    if (instructor.approvalStatus !== 'approved') {
      return res.status(400).json({ success: false, message: 'Instructor must be approved before assignment.' });
    }

    // Lock the teacher's current rate at scheduling time
    const perClassRate = (instructor.profile && instructor.profile.perClassRate) || 0;

    // Update classroom
    classroom.teacher = instructorId;
    classroom.status = 'active';
    classroom.totalSessions = scheduleDates.length;
    classroom.startedAt = new Date();
    await classroom.save();

    // Prepare student attendance entries for each session
    const studentAttendance = (classroom.enrolledStudents || []).map((studentId) => ({
      studentId,
      attendanceStatus: 'pending',
    }));

    // Bulk-create sessions with locked snapshotRate
    const sessionDocs = scheduleDates.map((dateStr, index) => {
      const startTime = new Date(dateStr);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1-hour default

      return {
        classroom: classroom._id,
        sessionNumber: index + 1,
        title: `Session ${index + 1}`,
        scheduledDate: startTime,
        startTime,
        endTime,
        status: 'scheduled',
        meetingStatus: 'pending',
        createdBy: req.user.id,
        studentAttendance,
        snapshotRate: perClassRate,
        financials: { earnedAmount: 0, penaltyAmount: 0, penaltyType: 'none', finalPayout: 0 },
      };
    });

    const sessions = await Session.insertMany(sessionDocs);

    // Populate for response
    const updatedClassroom = await Classroom.findById(classroom._id)
      .populate('teacher', 'name email profile')
      .populate('enrolledStudents', 'name')
      .populate('course', 'title');

    res.status(201).json({
      success: true,
      data: {
        classroom: updatedClassroom,
        sessions,
        message: `Assigned instructor and created ${sessions.length} sessions.`,
      },
    });
  } catch (error) {
    console.error('scheduleBatch error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during scheduling' });
  }
};

// @desc    Get payroll data for all teachers in a given month (with financials)
// @route   GET /api/admin/payouts?month=7&year=2026
// @access  Private/Admin
const getPayouts = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Valid month (1-12) and year query parameters are required',
      });
    }

    // Build UTC date range for the month
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const payroll = await Session.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'cancelled'] },
          scheduledDate: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $lookup: {
          from: 'classrooms',
          localField: 'classroom',
          foreignField: '_id',
          as: 'classroomData',
        },
      },
      { $unwind: '$classroomData' },
      // Lookup course for session details
      {
        $lookup: {
          from: 'courses',
          localField: 'classroomData.course',
          foreignField: '_id',
          as: 'courseData',
        },
      },
      { $unwind: { path: '$courseData', preserveNullAndEmptyArrays: true } },
      // Lookup enrolled students for names
      {
        $lookup: {
          from: 'users',
          localField: 'classroomData.enrolledStudents',
          foreignField: '_id',
          as: 'studentData',
        },
      },
      // Group by teacher, accumulate session details
      {
        $group: {
          _id: '$classroomData.teacher',
          completedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          grossEarnings: { $sum: { $ifNull: ['$financials.earnedAmount', 0] } },
          totalPenalty: { $sum: { $ifNull: ['$financials.penaltyAmount', 0] } },
          noShowCount: {
            $sum: { $cond: [{ $eq: ['$financials.penaltyType', 'noshow'] }, 1, 0] },
          },
          noShowAmount: {
            $sum: {
              $cond: [
                { $eq: ['$financials.penaltyType', 'noshow'] },
                { $ifNull: ['$financials.penaltyAmount', 0] },
                0,
              ],
            },
          },
          lateCount: {
            $sum: { $cond: [{ $eq: ['$financials.penaltyType', 'late'] }, 1, 0] },
          },
          lateAmount: {
            $sum: {
              $cond: [
                { $eq: ['$financials.penaltyType', 'late'] },
                { $ifNull: ['$financials.penaltyAmount', 0] },
                0,
              ],
            },
          },
          lmcCount: {
            $sum: { $cond: [{ $eq: ['$financials.penaltyType', 'lmc'] }, 1, 0] },
          },
          lmcAmount: {
            $sum: {
              $cond: [
                { $eq: ['$financials.penaltyType', 'lmc'] },
                { $ifNull: ['$financials.penaltyAmount', 0] },
                0,
              ],
            },
          },
          sessions: {
            $push: {
              sessionId: '$_id',
              sessionNumber: '$sessionNumber',
              title: '$title',
              scheduledDate: '$scheduledDate',
              startTime: '$startTime',
              status: '$status',
              classroomType: '$classroomData.classroomType',
              courseTitle: '$courseData.title',
              studentNames: '$studentData.name',
              financials: '$financials',
              isTeacherLate: '$isTeacherLate',
              isNoShow: '$isNoShow',
              studentNoShowExempt: '$studentNoShowExempt',
              cancellationReason: '$cancellationReason',
              snapshotRate: '$snapshotRate',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'teacherData',
        },
      },
      { $unwind: '$teacherData' },
      {
        $project: {
          _id: 0,
          teacherId: '$_id',
          teacherName: '$teacherData.name',
          perClassRate: { $ifNull: ['$teacherData.profile.perClassRate', 0] },
          completedSessions: 1,
          grossEarnings: 1,
          totalPenalty: 1,
          netPayout: { $subtract: ['$grossEarnings', '$totalPenalty'] },
          deductions: {
            noShow: { count: '$noShowCount', amount: '$noShowAmount' },
            late: { count: '$lateCount', amount: '$lateAmount' },
            lmc: { count: '$lmcCount', amount: '$lmcAmount' },
          },
          sessions: 1,
        },
      },
      { $sort: { teacherName: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    console.error('getPayouts error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching payroll' });
  }
};
// @desc    Add a single new session to an active classroom
// @route   POST /api/admin/classrooms/:id/sessions
// @access  Private/Admin
const addSingleSession = async (req, res) => {
  try {
    const { scheduleDate, sessionNumber } = req.body;
    if (!scheduleDate) {
      return res.status(400).json({ success: false, message: 'scheduleDate is required' });
    }

    const classroom = await Classroom.findById(req.params.id).populate('teacher', 'profile');
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    if (classroom.status !== 'active' && classroom.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add sessions to a classroom that is not active or completed.',
      });
    }

    // Lock the teacher's current rate
    const perClassRate = (classroom.teacher && classroom.teacher.profile && classroom.teacher.profile.perClassRate) || 0;

    // Prepare student attendance entries
    const studentAttendance = (classroom.enrolledStudents || []).map((studentId) => ({
      studentId,
      attendanceStatus: 'pending',
    }));

    let finalSessionNumber = sessionNumber;
    if (!finalSessionNumber) {
      const existingSessions = await Session.find({ classroom: classroom._id }).sort({ sessionNumber: -1 }).limit(1);
      finalSessionNumber = existingSessions.length > 0 ? (existingSessions[0].sessionNumber || 0) + 1 : 1;
    }

    const startTime = new Date(scheduleDate);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const newSession = await Session.create({
      classroom: classroom._id,
      sessionNumber: finalSessionNumber,
      title: `Session ${finalSessionNumber}`,
      scheduledDate: startTime,
      startTime,
      endTime,
      status: 'scheduled',
      meetingStatus: 'pending',
      createdBy: req.user.id,
      studentAttendance,
      snapshotRate: perClassRate,
      financials: { earnedAmount: 0, penaltyAmount: 0, penaltyType: 'none', finalPayout: 0 },
    });

    classroom.totalSessions = (classroom.totalSessions || 0) + 1;
    await classroom.save();

    res.status(201).json({
      success: true,
      data: newSession,
      message: 'Extra session added successfully.',
    });
  } catch (error) {
    console.error('addSingleSession error:', error.message);
    res.status(500).json({ success: false, message: 'Server error adding session' });
  }
};

module.exports = { scheduleBatch, getPayouts, addSingleSession };
