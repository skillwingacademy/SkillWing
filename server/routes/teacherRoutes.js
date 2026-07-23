const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { getMyPayouts } = require('../controllers/teacherPayoutController');

// All teacher routes are protected and restricted to teacher role
router.use(protect);
router.use(authorize('teacher'));

// GET /api/teacher/payouts
router.get('/payouts', getMyPayouts);

module.exports = router;
