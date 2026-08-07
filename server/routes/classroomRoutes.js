const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const {
  getTeacherClassrooms,
  getClassroomById,
  getClassroomDetails,
  createSession,
} = require('../controllers/classroomController');
const {
  getSessionById,
  updateSession,
  completeSession,
  cancelSession,
  rescheduleSession,
  markAttendance,
} = require('../controllers/sessionController');
const {
  uploadFile,
  deleteFile,
} = require('../controllers/sessionFileController');
const { generateZoomLink, getZoomHostLink } = require('../controllers/zoomController');

// Multer memoryStorage for session file uploads (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'), false);
    }
  },
});

// ── Classroom routes ──────────────────────────
router.get('/teacher', protect, authorize('teacher', 'admin'), getTeacherClassrooms);
router.get('/:id', protect, authorize('teacher', 'admin', 'student'), getClassroomById);
router.get('/:id/details', protect, authorize('teacher', 'admin', 'student'), getClassroomDetails);
router.post('/:id/sessions', protect, authorize('teacher', 'admin'), createSession);

// ── Session management routes ───────────────────────────
router.get('/sessions/:id', protect, getSessionById);
router.put('/sessions/:id', protect, authorize('teacher', 'admin'), updateSession);
router.patch('/sessions/:id/complete', protect, authorize('teacher', 'admin'), completeSession);
router.patch('/sessions/:id/cancel', protect, authorize('admin'), cancelSession);
router.patch('/sessions/:id/reschedule', protect, authorize('admin'), rescheduleSession);
router.patch('/sessions/:id/attendance', protect, authorize('teacher', 'admin'), markAttendance);
router.post('/sessions/:id/generate-zoom-link', protect, authorize('teacher', 'admin'), generateZoomLink);
router.post('/sessions/:id/zoom-host-link', protect, authorize('teacher', 'admin'), getZoomHostLink);

// ── Session file routes ─────────────────────────────────
router.post('/sessions/:id/files', protect, authorize('teacher', 'admin'), upload.single('file'), uploadFile);
router.delete('/sessions/:id/files', protect, authorize('teacher', 'admin'), deleteFile);

module.exports = router;
