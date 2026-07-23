const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { getProfile, getProfileById, updateProfile, uploadAvatar, removeAvatar } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// ── Multer config for avatar uploads (memory storage for GCS) ──
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// All routes are protected
router.use(protect);

// GET /api/users/profile
router.get('/profile', getProfile);

// GET /api/users/profile/:id (view anyone's profile)
router.get('/profile/:id', getProfileById);

// PUT /api/users/profile
router.put('/profile', updateProfile);

// POST /api/users/profile/avatar
router.post('/profile/avatar', upload.single('avatar'), uploadAvatar);

// DELETE /api/users/profile/avatar
router.delete('/profile/avatar', removeAvatar);

module.exports = router;
