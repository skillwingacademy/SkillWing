const User = require('../models/User');
const ChatContact = require('../models/ChatContact');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const multer = require('multer');

const PAGE_SIZE = 30;

// Multer in-memory storage for chat image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed.'));
    }
  },
});
exports.uploadImageMiddleware = upload.single('image');

// ── Lazy GCS helper ──────────────────────────────────────────────────────────
async function uploadChatImageToGCS(fileBuffer, filename, mimeType) {
  let storage;
  try {
    storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILE
        ? path.resolve(process.env.GCS_KEY_FILE)
        : undefined,
    });
  } catch {
    throw new Error('GCS not configured');
  }
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw new Error('GCS_BUCKET_NAME not set');

  const objectName = `chat/${filename}`;
  const blob = storage.bucket(bucketName).file(objectName);
  await blob.save(fileBuffer, { metadata: { contentType: mimeType } });
  return `https://storage.googleapis.com/${bucketName}/${objectName}`;
}

// ── Contact visibility helper ────────────────────────────────────────────────
async function getContactIds(user) {
  if (user.role === 'admin') {
    // Admin: return all non-admin users (base contacts); extra search handled by /contacts?search=
    const users = await User.find({ _id: { $ne: user._id } })
      .select('_id')
      .lean();
    return users.map((u) => u._id.toString());
  }
  // Students and teachers: lookup adjacency table + always include admin
  const contacts = await ChatContact.find({ userId: user._id }).select('contactId').lean();
  const contactIds = contacts.map((c) => c.contactId.toString());

  // Always add admin to contact list
  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  admins.forEach((a) => {
    if (!contactIds.includes(a._id.toString())) contactIds.push(a._id.toString());
  });
  return contactIds;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/contacts
// Returns the list of users this person can message.
// Admin gets only users they have already conversed with, plus a ?search= option
// to find anyone by name/email.
// ─────────────────────────────────────────────────────────────────────────────
exports.getContacts = async (req, res) => {
  try {
    const me = req.user;
    const { search } = req.query;

    if (me.role === 'admin') {
      if (search && search.trim()) {
        // Admin searching for a user to start a new chat with
        const regex = new RegExp(search.trim(), 'i');
        const users = await User.find({
          _id: { $ne: me._id },
          $or: [{ name: regex }, { email: regex }],
        })
          .select('name email role profile.avatarUrl avatar')
          .limit(20)
          .lean();
        return res.json({ success: true, data: users });
      }
      // Admin: show only people they have an existing conversation with
      const convos = await Conversation.find({ participants: me._id })
        .populate('participants', 'name email role profile.avatarUrl avatar')
        .lean();
      const contacts = convos
        .map((c) => c.participants.find((p) => p._id.toString() !== me._id.toString()))
        .filter(Boolean);
      // dedupe
      const seen = new Set();
      const unique = contacts.filter((c) => {
        if (seen.has(c._id.toString())) return false;
        seen.add(c._id.toString());
        return true;
      });
      return res.json({ success: true, data: unique });
    }

    // Student / Teacher: lookup adjacency table
    const contactDocs = await ChatContact.find({ userId: me._id })
      .populate('contactId', 'name email role profile.avatarUrl avatar')
      .lean();

    const contacts = contactDocs
      .map((c) => c.contactId)
      .filter(Boolean);

    // Always include admins
    const admins = await User.find({ role: 'admin' })
      .select('name email role profile.avatarUrl avatar')
      .lean();
    admins.forEach((a) => {
      if (!contacts.find((c) => c._id.toString() === a._id.toString())) {
        contacts.push(a);
      }
    });

    // Optional name/email filter
    let filtered = contacts;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filtered = contacts.filter(
        (c) => regex.test(c.name) || regex.test(c.email)
      );
    }

    res.json({ success: true, data: filtered });
  } catch (err) {
    console.error('getContacts error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/conversations
// Returns all conversation threads for the current user.
// ─────────────────────────────────────────────────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    const me = req.user;

    const conversations = await Conversation.find({ participants: me._id })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name email role profile.avatarUrl avatar')
      .populate('lastMessage', 'type content imageUrl createdAt sender')
      .lean();

    // Attach unread count for current user
    const result = conversations.map((c) => ({
      ...c,
      unreadCount: (c.unreadCounts && c.unreadCounts[me._id.toString()]) || 0,
      otherParticipant: c.participants.find(
        (p) => p._id.toString() !== me._id.toString()
      ),
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('getConversations error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/conversations
// Start or retrieve an existing conversation with a recipient.
// Body: { recipientId }
// ─────────────────────────────────────────────────────────────────────────────
exports.startConversation = async (req, res) => {
  try {
    const me = req.user;
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'recipientId is required' });
    }
    if (recipientId === me._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    }

    // Verify permission (non-admins must have a ChatContact entry or recipient must be admin)
    if (me.role !== 'admin') {
      const recipient = await User.findById(recipientId).select('role');
      if (!recipient) {
        return res.status(404).json({ success: false, message: 'Recipient not found' });
      }
      if (recipient.role !== 'admin') {
        const contact = await ChatContact.findOne({ userId: me._id, contactId: recipientId });
        if (!contact) {
          return res.status(403).json({ success: false, message: 'You are not allowed to message this user' });
        }
      }
    }

    // Sort participants for stable uniqueness check
    const sorted = [me._id.toString(), recipientId].sort();

    // Try to find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: sorted, $size: 2 },
    })
      .populate('participants', 'name email role profile.avatarUrl avatar')
      .populate('lastMessage', 'type content imageUrl createdAt sender');

    if (!conversation) {
      conversation = await Conversation.create({ participants: sorted });
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name email role profile.avatarUrl avatar')
        .populate('lastMessage', 'type content imageUrl createdAt sender');
    }

    res.json({ success: true, data: conversation });
  } catch (err) {
    console.error('startConversation error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/conversations/:id/messages
// Paginated messages (newest 30, cursor-based with ?before=<messageId>)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const me = req.user;
    const { id: conversationId } = req.params;
    const { before } = req.query; // cursor: load messages older than this ID

    // Verify participant
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(String).includes(me._id.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const query = { conversation: conversationId };
    if (before) {
      const cursorMsg = await Message.findById(before).select('createdAt');
      if (cursorMsg) query.createdAt = { $lt: cursorMsg.createdAt };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .populate('sender', 'name email role profile.avatarUrl avatar')
      .lean();

    // Return oldest-first for rendering
    res.json({ success: true, data: messages.reverse(), hasMore: messages.length === PAGE_SIZE });
  } catch (err) {
    console.error('getMessages error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/conversations/:id/messages
// Send a text message
// Body: { content }
// ─────────────────────────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const me = req.user;
    const { id: conversationId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(String).includes(me._id.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: me._id,
      type: 'text',
      content: content.trim(),
      readBy: [me._id],
    });

    // Update conversation metadata
    const recipientId = convo.participants.find((p) => p.toString() !== me._id.toString());
    const unreadCounts = convo.unreadCounts || new Map();
    const currentUnread = unreadCounts.get(recipientId.toString()) || 0;
    unreadCounts.set(recipientId.toString(), currentUnread + 1);

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
      unreadCounts,
    });

    const populated = await message.populate('sender', 'name email role profile.avatarUrl avatar');

    // Emit via socket (if io is attached to app)
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', {
        conversationId,
        message: populated,
      });
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('sendMessage error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/conversations/:id/messages/image
// Send an image message (multipart/form-data, field: "image")
// ─────────────────────────────────────────────────────────────────────────────
exports.sendImageMessage = async (req, res) => {
  try {
    const me = req.user;
    const { id: conversationId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(String).includes(me._id.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Upload to GCS
    const ext = req.file.originalname.split('.').pop();
    const filename = `chat-${me._id}-${Date.now()}.${ext}`;
    const imageUrl = await uploadChatImageToGCS(req.file.buffer, filename, req.file.mimetype);

    const message = await Message.create({
      conversation: conversationId,
      sender: me._id,
      type: 'image',
      content: req.body.caption || '',
      imageUrl,
      readBy: [me._id],
    });

    const recipientId = convo.participants.find((p) => p.toString() !== me._id.toString());
    const unreadCounts = convo.unreadCounts || new Map();
    const currentUnread = unreadCounts.get(recipientId.toString()) || 0;
    unreadCounts.set(recipientId.toString(), currentUnread + 1);

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
      unreadCounts,
    });

    const populated = await message.populate('sender', 'name email role profile.avatarUrl avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', {
        conversationId,
        message: populated,
      });
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('sendImageMessage error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/chat/conversations/:id/read
// Mark all messages in a conversation as read for the current user.
// ─────────────────────────────────────────────────────────────────────────────
exports.markAsRead = async (req, res) => {
  try {
    const me = req.user;
    const { id: conversationId } = req.params;

    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(String).includes(me._id.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Add current user to readBy for all unread messages in this conversation
    await Message.updateMany(
      { conversation: conversationId, readBy: { $ne: me._id } },
      { $addToSet: { readBy: me._id } }
    );

    // Reset unread count for current user
    const unreadCounts = convo.unreadCounts || new Map();
    unreadCounts.set(me._id.toString(), 0);
    await Conversation.findByIdAndUpdate(conversationId, { unreadCounts });

    // Notify the other participant via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        readBy: me._id,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('markAsRead error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/unread-count
// Total unread messages count across all conversations (for badge in sidebar)
// ─────────────────────────────────────────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const me = req.user;
    const convos = await Conversation.find({ participants: me._id }).lean();
    let total = 0;
    convos.forEach((c) => {
      total += (c.unreadCounts && c.unreadCounts[me._id.toString()]) || 0;
    });
    res.json({ success: true, data: { total } });
  } catch (err) {
    console.error('getUnreadCount error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/admin/all-conversations   (Admin only)
// Returns every conversation in the system with participants + last message.
// ─────────────────────────────────────────────────────────────────────────────
exports.adminGetAllConversations = async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};
    if (search && search.trim()) {
      // Find matching user IDs first, then filter conversations
      const regex = new RegExp(search.trim(), 'i');
      const matchingUsers = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select('_id').lean();
      const ids = matchingUsers.map((u) => u._id);
      query = { participants: { $in: ids } };
    }

    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name email role profile.avatarUrl avatar')
      .populate('lastMessage', 'type content imageUrl createdAt sender')
      .lean();

    res.json({ success: true, data: conversations });
  } catch (err) {
    console.error('adminGetAllConversations error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/admin/conversations/:id/messages   (Admin only)
// Returns paginated messages for any conversation — bypasses participant check.
// ─────────────────────────────────────────────────────────────────────────────
exports.adminGetMessages = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { before } = req.query;

    const convo = await Conversation.findById(conversationId);
    if (!convo) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const query = { conversation: conversationId };
    if (before) {
      const cursorMsg = await Message.findById(before).select('createdAt');
      if (cursorMsg) query.createdAt = { $lt: cursorMsg.createdAt };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .populate('sender', 'name email role profile.avatarUrl avatar')
      .lean();

    res.json({
      success: true,
      data: messages.reverse(),
      hasMore: messages.length === PAGE_SIZE,
    });
  } catch (err) {
    console.error('adminGetMessages error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
