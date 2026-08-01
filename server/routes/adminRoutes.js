const express = require('express');
const router = express.Router();
const {
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
  getApprovedTeachers,
  getAllStudents,
  getClassroomStats,
  getSessionStats,
  getTeacherWorkload,
  getAllClassrooms,
  updateTeacherRate,
  getTeacherRateConfig,
  updateTeacherRateConfig,
  updateTeacherLevelAndRate
} = require('../controllers/adminController');
const { scheduleBatch, getPayouts, addSingleSession } = require('../controllers/adminScheduleController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// All admin routes are protected and restricted to admin role
router.use(protect);
router.use(authorize('admin'));

// GET & PUT /api/admin/teacher-rates
router.get('/teacher-rates', getTeacherRateConfig);
router.put('/teacher-rates', updateTeacherRateConfig);

// PUT & PATCH /api/admin/teachers/:id/rate-level
router.put('/teachers/:id/rate-level', updateTeacherLevelAndRate);
router.patch('/teachers/:id/rate-level', updateTeacherLevelAndRate);

// GET /api/admin/teachers/pending
router.get('/teachers/pending', getPendingTeachers);

// GET /api/admin/teachers/approved
router.get('/teachers/approved', getApprovedTeachers);

// GET /api/admin/students
router.get('/students', getAllStudents);

// GET /api/admin/classrooms
router.get('/classrooms', getAllClassrooms);

// PUT /api/admin/teachers/:id/approve
router.put('/teachers/:id/approve', approveTeacher);

// PUT /api/admin/teachers/:id/reject
router.put('/teachers/:id/reject', rejectTeacher);

// PATCH /api/admin/teachers/:id/rate
router.patch('/teachers/:id/rate', updateTeacherRate);

// GET /api/admin/stats/classrooms
router.get('/stats/classrooms', getClassroomStats);

// GET /api/admin/stats/sessions
router.get('/stats/sessions', getSessionStats);

// GET /api/admin/stats/teacher-workload
router.get('/stats/teacher-workload', getTeacherWorkload);

// POST /api/admin/classrooms/:id/schedule-batch
router.post('/classrooms/:id/schedule-batch', scheduleBatch);

// GET /api/admin/payouts
router.get('/payouts', getPayouts);

// POST /api/admin/classrooms/:id/sessions
router.post('/classrooms/:id/sessions', addSingleSession);

module.exports = router;

