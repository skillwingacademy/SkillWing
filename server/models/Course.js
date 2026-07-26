const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
    },
    introduction: {
      type: String,
      default: '',
    },
    // Legacy single price field — kept for backward compatibility
    price: {
      type: Number,
      default: 0,
    },
    // New: tier-based pricing
    pricing: {
      inr: {
        oneOnOne: { type: Number, default: 0 },
        double: { type: Number, default: 0 },
        batch: { type: Number, default: 0 },
      },
      usd: {
        oneOnOne: { type: Number, default: 0 },
        double: { type: Number, default: 0 },
        batch: { type: Number, default: 0 },
      },
      discounts: {
        month3: { type: Number, default: 0 },
        month6: { type: Number, default: 0 },
        month9: { type: Number, default: 0 },
      },
    },
    maxBatchCapacity: {
      type: Number,
      default: 10,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    thumbnailImage: {
      type: String,
      default: '',
    },
    // Legacy single educator field — kept for backward compatibility
    educator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // New: supports multiple instructors
    instructors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    courseDetails: {
      batchTypes: {
        type: [String],
        default: [],
      },
      totalSessions: {
        type: Number,
      },
      duration: {
        type: String,
      },
      skillLevel: {
        type: String,
      },
      language: {
        type: String,
        default: 'English',
      },
    },
    whatYouWillReceive: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Course', courseSchema);
