const express = require('express');
const router = express.Router();
const {
  createDemoOrder,
  verifyDemoPayment,
  getMyDemoRequests,
  getMyAssignedDemos,
  adminGetAllDemos,
  adminScheduleDemo,
  adminCompleteDemo,
  adminCancelDemo,
} = require('../controllers/demoController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

router.use(protect);

// ── Student routes ────────────────────────────────────────────────────────────
// POST /api/demo/create-order      — create payment order for demo fee
router.post('/create-order', authorize('student'), createDemoOrder);

// POST /api/demo/verify-payment    — verify payment and create demo request
router.post('/verify-payment', authorize('student'), verifyDemoPayment);

// GET  /api/demo/my-requests       — student's own demo history
router.get('/my-requests', authorize('student'), getMyDemoRequests);

// ── Teacher routes ────────────────────────────────────────────────────────────
// GET  /api/demo/my-assigned      — demos assigned to this teacher
router.get('/my-assigned', authorize('teacher'), getMyAssignedDemos);

// ── Admin routes ──────────────────────────────────────────────────────────────
// GET   /api/demo/admin/requests              — all demo requests
router.get('/admin/requests', authorize('admin'), adminGetAllDemos);

// PATCH /api/demo/admin/:id/schedule          — schedule a demo
router.patch('/admin/:id/schedule', authorize('admin'), adminScheduleDemo);

// PATCH /api/demo/admin/:id/complete          — mark demo as completed
router.patch('/admin/:id/complete', authorize('admin'), adminCompleteDemo);

// PATCH /api/demo/admin/:id/cancel            — cancel a demo
router.patch('/admin/:id/cancel', authorize('admin'), adminCancelDemo);

module.exports = router;
