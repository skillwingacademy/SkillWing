const express = require('express');
const router = express.Router();
const {
  getContacts,
  getConversations,
  startConversation,
  getMessages,
  sendMessage,
  sendImageMessage,
  markAsRead,
  getUnreadCount,
  uploadImageMiddleware,
  adminGetAllConversations,
  adminGetMessages,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// All chat routes require authentication
router.use(protect);

// GET  /api/chat/contacts               — list of people user can message
router.get('/contacts', getContacts);

// GET  /api/chat/unread-count           — total unread count (for badge)
router.get('/unread-count', getUnreadCount);

// GET  /api/chat/conversations          — all conversation threads
router.get('/conversations', getConversations);

// POST /api/chat/conversations          — start or get a conversation
router.post('/conversations', startConversation);

// GET  /api/chat/conversations/:id/messages    — paginated messages
router.get('/conversations/:id/messages', getMessages);

// POST /api/chat/conversations/:id/messages    — send text message
router.post('/conversations/:id/messages', sendMessage);

// POST /api/chat/conversations/:id/messages/image — send image
router.post('/conversations/:id/messages/image', uploadImageMiddleware, sendImageMessage);

// PATCH /api/chat/conversations/:id/read — mark as read
router.patch('/conversations/:id/read', markAsRead);

// ── Admin-only monitoring routes ──────────────────────────────────────────────
// GET  /api/chat/admin/all-conversations              — all convos in system
router.get('/admin/all-conversations', authorize('admin'), adminGetAllConversations);

// GET  /api/chat/admin/conversations/:id/messages     — messages for any convo
router.get('/admin/conversations/:id/messages', authorize('admin'), adminGetMessages);

module.exports = router;
