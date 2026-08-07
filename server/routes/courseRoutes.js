const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  getTeacherCourses,
  getEnrolledCourses,
  uploadThumbnail,
} = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// IMPORTANT: Specific routes MUST come before /:id to avoid conflicts

// ── Multer config for thumbnail uploads (memory storage for GCS) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// POST /api/courses/upload-thumbnail — upload thumbnail to GCS
router.post('/upload-thumbnail', protect, authorize('admin'), upload.single('thumbnail'), uploadThumbnail);

// GET /api/courses/enrolled/me — student's enrolled courses
router.get('/enrolled/me', protect, authorize('student'), getEnrolledCourses);

// GET /api/courses/teacher/me — teacher's own courses
router.get('/teacher/me', protect, authorize('teacher', 'admin'), getTeacherCourses);

// GET /api/courses — all active courses (public)
router.get('/', getAllCourses);

// GET /api/courses/:id — single course (public)
router.get('/:id', getCourseById);

// POST /api/courses — create course (admin only)
router.post('/', protect, authorize('admin'), createCourse);

// PUT /api/courses/:id — update course (admin only)
router.put('/:id', protect, authorize('admin'), updateCourse);

module.exports = router;
