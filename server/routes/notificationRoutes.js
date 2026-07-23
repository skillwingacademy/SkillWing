const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  subscribe,
  unsubscribe,
  getVapidPublicKey,
} = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

// GET  /api/notifications/vapid-public-key — return VAPID public key
router.get('/vapid-public-key', getVapidPublicKey);

// POST /api/notifications/subscribe — save push subscription
router.post('/subscribe', subscribe);

// DELETE /api/notifications/unsubscribe — remove push subscription
router.delete('/unsubscribe', unsubscribe);

module.exports = router;
