const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.io handler — manages authentication and real-time events.
 *
 * Events (client → server):
 *   join_conversation   { conversationId }   — join a socket room
 *   leave_conversation  { conversationId }   — leave a socket room
 *   typing              { conversationId }   — broadcast typing indicator
 *   stop_typing         { conversationId }   — broadcast stop typing
 *
 * Events (server → client):
 *   new_message         { conversationId, message }
 *   messages_read       { conversationId, readBy }
 *   user_typing         { conversationId, userId, userName }
 *   user_stop_typing    { conversationId, userId }
 *   error               { message }
 */
function socketHandler(io) {
  // Middleware: authenticate JWT on socket connection
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name role');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.user.name} (${socket.user._id})`);

    // Join the user's personal room (for targeted delivery)
    socket.join(`user:${socket.user._id}`);

    // ── Join a conversation room ───────────────────────────────────
    socket.on('join_conversation', ({ conversationId }) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    // ── Leave a conversation room ──────────────────────────────────
    socket.on('leave_conversation', ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    // ── Typing indicator ──────────────────────────────────────────
    socket.on('typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId: socket.user._id,
        userName: socket.user.name,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId: socket.user._id,
      });
    });

    // ── Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user.name}`);
    });
  });
}

module.exports = socketHandler;
