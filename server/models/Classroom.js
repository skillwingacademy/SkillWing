const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema(
  {
    // New: supports multiple students
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    studentAttendance: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        presentCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    classroomType: {
      type: String,
      enum: ['1-on-1', 'Double', 'Batch'],
      required: [true, 'Classroom type is required'],
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Max capacity is required'],
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'cancelled', 'pending_assignment'],
      default: 'pending_assignment',
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    completedSessions: {
      type: Number,
      default: 0,
    },
    nextSessionNumber: {
      type: Number,
      default: 1,
    },
    progressPercentage: {
      type: Number,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    paymentId: {
      type: String,
      default: '',
    },
    paymentProvider: {
      type: String,
      enum: ['mock', 'razorpay', ''],
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'refunded'],
      default: 'paid',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index to find open classrooms for Double/Batch enrollment
classroomSchema.index({ course: 1, classroomType: 1, status: 1 });

module.exports = mongoose.model('Classroom', classroomSchema);
