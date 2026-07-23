const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// POST /api/payments/create-order — create payment order (mock or Razorpay)
router.post(
  '/create-order',
  protect,
  authorize('student'),
  createOrder
);

// POST /api/payments/verify — verify payment and enroll student
router.post(
  '/verify',
  protect,
  authorize('student'),
  verifyPayment
);

module.exports = router;
