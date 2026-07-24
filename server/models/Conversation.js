const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Always exactly 2 participants — sorted by ObjectId string for a stable unique key
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    // Map of userId (string) → unread count
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Ensure we never create duplicate threads between the same two users
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
