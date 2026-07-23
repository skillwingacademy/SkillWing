const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const {
  getStudentClassrooms,
  getUpcomingClass,
  getTodayClasses,
  getPastClasses,
  getProgress,
} = require('../controllers/studentDashController');

// All student routes are protected
router.use(protect);
router.use(authorize('student'));

router.get('/classrooms', getStudentClassrooms);
router.get('/upcoming-class', getUpcomingClass);
router.get('/today-class', getTodayClasses);
router.get('/past-classes', getPastClasses);
router.get('/progress', getProgress);

module.exports = router;
