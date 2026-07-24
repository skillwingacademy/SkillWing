const DemoRequest = require('../models/DemoRequest');
const Classroom = require('../models/Classroom');
const Course = require('../models/Course');
const User = require('../models/User');
const ChatContact = require('../models/ChatContact');
const { sendPushToUser } = require('./notificationController');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/demo/request
// Student requests a free demo for a course they haven't bought.
// ─────────────────────────────────────────────────────────────────────────────
exports.requestDemo = async (req, res) => {
  try {
    const { courseId } = req.body;
    const studentId = req.user._id;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    // 1. Course must exist
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // 2. Student must not already be enrolled (any non-cancelled classroom)
    const existing = await Classroom.findOne({
      course: courseId,
      enrolledStudents: studentId,
      status: { $in: ['active', 'paused', 'pending_assignment'] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course',
      });
    }

    // 3. One demo per student per course
    const alreadyRequested = await DemoRequest.findOne({
      student: studentId,
      course: courseId,
    });
    if (alreadyRequested) {
      return res.status(400).json({
        success: false,
        message: 'You have already used your free demo for this course',
      });
    }

    // 4. Create the request
    const demo = await DemoRequest.create({
      student: studentId,
      course: courseId,
    });

    // 5. Notify all admins (graceful — never crashes)
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      const studentName = req.user.name || 'A student';
      for (const admin of admins) {
        await sendPushToUser(admin._id, {
          title: 'New Demo Request',
          body: `${studentName} requested a demo for "${course.title}"`,
          url: '/admin/dashboard',
        });
      }
    } catch (notifErr) {
      console.warn('[Demo] Admin notification failed:', notifErr.message);
    }

    const populated = await DemoRequest.findById(demo._id)
      .populate('course', 'title thumbnailImage')
      .populate('student', 'name email');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already used your free demo for this course',
      });
    }
    console.error('requestDemo error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/demo/my-requests
// Student sees their own demo requests.
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyDemoRequests = async (req, res) => {
  try {
    const demos = await DemoRequest.find({ student: req.user._id })
      .populate('course', 'title thumbnailImage description')
      .populate('instructor', 'name email profile')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: demos });
  } catch (err) {
    console.error('getMyDemoRequests error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/demo/my-assigned   (Teacher)
// Teacher sees demo sessions assigned to them.
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyAssignedDemos = async (req, res) => {
  try {
    const demos = await DemoRequest.find({
      instructor: req.user._id,
      status: { $in: ['scheduled', 'completed'] },
    })
      .populate('course', 'title thumbnailImage description')
      .populate('student', 'name email profile')
      .sort({ scheduledAt: 1 });

    res.json({ success: true, data: demos });
  } catch (err) {
    console.error('getMyAssignedDemos error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/demo/admin/requests   (Admin)
// All demo requests, optionally filtered by ?status=
// ─────────────────────────────────────────────────────────────────────────────
exports.adminGetAllDemos = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const demos = await DemoRequest.find(filter)
      .populate('course', 'title thumbnailImage')
      .populate('student', 'name email profile')
      .populate('instructor', 'name email profile')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: demos });
  } catch (err) {
    console.error('adminGetAllDemos error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/demo/admin/:id/schedule   (Admin)
// Assign instructor, date, meet link. Notifies student and adds ChatContact.
// ─────────────────────────────────────────────────────────────────────────────
exports.adminScheduleDemo = async (req, res) => {
  try {
    const { instructorId, scheduledAt, meetLink, durationMinutes, adminNotes } = req.body;

    if (!instructorId || !scheduledAt || !meetLink) {
      return res.status(400).json({
        success: false,
        message: 'instructorId, scheduledAt, and meetLink are required',
      });
    }

    const demo = await DemoRequest.findById(req.params.id)
      .populate('course', 'title')
      .populate('student', 'name _id');

    if (!demo) {
      return res.status(404).json({ success: false, message: 'Demo request not found' });
    }
    if (demo.status === 'completed' || demo.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot schedule a demo that is already ${demo.status}`,
      });
    }

    // Validate instructor exists and is a teacher
    const instructor = await User.findOne({ _id: instructorId, role: 'teacher' });
    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    demo.instructor = instructorId;
    demo.scheduledAt = new Date(scheduledAt);
    demo.meetLink = meetLink;
    demo.durationMinutes = durationMinutes || 45;
    demo.adminNotes = adminNotes || '';
    demo.status = 'scheduled';
    await demo.save();

    // ── Add ChatContact entries for teacher ↔ student ─────────────────────
    await Promise.all([
      ChatContact.findOneAndUpdate(
        { userId: instructorId, contactId: demo.student._id },
        { userId: instructorId, contactId: demo.student._id },
        { upsert: true, new: true }
      ),
      ChatContact.findOneAndUpdate(
        { userId: demo.student._id, contactId: instructorId },
        { userId: demo.student._id, contactId: instructorId },
        { upsert: true, new: true }
      ),
    ]);

    // ── Notify student ────────────────────────────────────────────────────
    try {
      const dateStr = new Date(scheduledAt).toLocaleString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      await sendPushToUser(demo.student._id, {
        title: 'Demo Class Scheduled!',
        body: `Your demo for "${demo.course.title}" is on ${dateStr}`,
        url: '/dashboard',
      });
    } catch (notifErr) {
      console.warn('[Demo] Student notification failed:', notifErr.message);
    }

    const updated = await DemoRequest.findById(demo._id)
      .populate('course', 'title thumbnailImage')
      .populate('student', 'name email profile')
      .populate('instructor', 'name email profile');

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('adminScheduleDemo error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/demo/admin/:id/complete   (Admin)
// Mark a demo as completed.
// ─────────────────────────────────────────────────────────────────────────────
exports.adminCompleteDemo = async (req, res) => {
  try {
    const demo = await DemoRequest.findById(req.params.id);
    if (!demo) return res.status(404).json({ success: false, message: 'Demo request not found' });

    demo.status = 'completed';
    demo.completedAt = new Date();
    await demo.save();

    res.json({ success: true, data: demo });
  } catch (err) {
    console.error('adminCompleteDemo error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/demo/admin/:id/cancel   (Admin)
// Cancel a demo request.
// ─────────────────────────────────────────────────────────────────────────────
exports.adminCancelDemo = async (req, res) => {
  try {
    const demo = await DemoRequest.findById(req.params.id)
      .populate('course', 'title')
      .populate('student', 'name _id');
    if (!demo) return res.status(404).json({ success: false, message: 'Demo request not found' });

    demo.status = 'cancelled';
    demo.cancellationReason = req.body.reason || '';
    await demo.save();

    // Notify student
    try {
      await sendPushToUser(demo.student._id, {
        title: 'Demo Class Cancelled',
        body: `Your demo for "${demo.course.title}" has been cancelled.${demo.cancellationReason ? ' Reason: ' + demo.cancellationReason : ''}`,
        url: '/dashboard',
      });
    } catch {}

    res.json({ success: true, data: demo });
  } catch (err) {
    console.error('adminCancelDemo error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
