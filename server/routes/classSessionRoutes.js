const express = require('express');
const router = express.Router();
const {
  getSessionsByCourse,
  createSession,
  updateSession,
  updateMeetLink,
  getTeacherSchedule,
} = require('../controllers/classSessionController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// IMPORTANT: Specific routes before parameterized routes

// GET /api/sessions/teacher/schedule — teacher's full schedule
router.get('/teacher/schedule', protect, authorize('teacher', 'admin'), getTeacherSchedule);

// GET /api/sessions/course/:courseId — sessions for a course
router.get('/course/:courseId', protect, getSessionsByCourse);

// POST /api/sessions — create session
router.post('/', protect, authorize('teacher', 'admin'), createSession);

// PUT /api/sessions/:id — update session title/times
router.put('/:id', protect, authorize('teacher', 'admin'), updateSession);

// PATCH /api/sessions/:id/meet-link — update meet link & visibility
router.patch('/:id/meet-link', protect, authorize('teacher', 'admin'), updateMeetLink);

module.exports = router;
