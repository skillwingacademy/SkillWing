const mongoose = require('mongoose');

const chatContactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The classroom that established this contact (optional, informational)
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate entries — each (userId, contactId) pair is unique
chatContactSchema.index({ userId: 1, contactId: 1 }, { unique: true });
// Fast lookup of all contacts for a user
chatContactSchema.index({ userId: 1 });

module.exports = mongoose.model('ChatContact', chatContactSchema);
