const mongoose = require('mongoose');
const Session = require('../models/Session');

// @desc    Get payout data for the logged-in teacher (with financials & deductions)
// @route   GET /api/teacher/payouts?month=7&year=2026
// @access  Private/Teacher
const getMyPayouts = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Valid month (1-12) and year query parameters are required',
      });
    }

    const teacherId = new mongoose.Types.ObjectId(req.user.id);

    // Build UTC date range for the month
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const result = await Session.aggregate([
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
      // Filter to only this teacher's classrooms
      {
        $match: {
          'classroomData.teacher': teacherId,
        },
      },
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
    ]);

    // Return the single teacher result or empty defaults
    const data = result.length > 0 ? result[0] : {
      teacherId: req.user.id,
      teacherName: req.user.name || '',
      perClassRate: 0,
      completedSessions: 0,
      grossEarnings: 0,
      totalPenalty: 0,
      netPayout: 0,
      deductions: {
        noShow: { count: 0, amount: 0 },
        late: { count: 0, amount: 0 },
        lmc: { count: 0, amount: 0 },
      },
      sessions: [],
    };

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('getMyPayouts error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching payouts' });
  }
};

module.exports = { getMyPayouts };
