const mongoose = require('mongoose');

const demoRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    // Payment details (populated after successful payment)
    paymentId: { type: String, default: '' },
    orderId:   { type: String, default: '' },
    paymentAmount:   { type: Number, default: 0 },
    paymentCurrency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'completed', 'cancelled'],
      default: 'pending',
    },
    // Set by admin when scheduling
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    meetLink: {
      type: String,
      default: '',
    },
    durationMinutes: {
      type: Number,
      default: 45,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    // Set when completed
    completedAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// One demo per student per course — enforced at DB level
demoRequestSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('DemoRequest', demoRequestSchema);
