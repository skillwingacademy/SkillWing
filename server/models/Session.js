const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: [true, 'Classroom is required'],
    },
    sessionNumber: {
      type: Number,
      required: [true, 'Session number is required'],
    },
    title: {
      type: String,
      required: [true, 'Session title is required'],
    },
    description: {
      type: String,
      default: '',
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    googleMeetLink: {
      type: String,
      default: '',
    },
    zoomMeetingId: {
      type: String,
      default: '',
    },
    meetingStatus: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending',
    },
    joinEnabled: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'missed'],
      default: 'scheduled',
    },
    homework: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ content: '', files: [] }),
    },
    teacherNotes: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ content: '', files: [] }),
    },
    recordingLink: {
      type: String,
      default: '',
    },
    teacherAttendance: {
      type: String,
      enum: ['absent', 'present', ''],
      default: '',
    },
    // Multi-student attendance tracking
    studentAttendance: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        attendanceStatus: {
          type: String,
          enum: ['present', 'absent', 'pending'],
          default: 'pending',
        },
      },
    ],
    teacherJoinedAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // ── Payroll Engine Fields ──────────────────────
    snapshotRate: {
      type: Number,
      default: 0,
    },
    // Zoom telemetry (populated by ZoomTelemetryService)
    zoomTelemetry: {
      teacherJoinTime: { type: Date },
      teacherLeaveTime: { type: Date },
      studentJoinTime: { type: Date },
      studentLeaveTime: { type: Date },
      totalParticipants: { type: Number, default: 0 },
      polledAt: { type: Date },
      rawParticipants: { type: mongoose.Schema.Types.Mixed },
    },
    // Telemetry
    actualTeacherJoinTime: {
      type: Date,
    },
    actualStudentJoinTime: {
      type: Date,
    },
    // Operational flags
    isTeacherLate: {
      type: Boolean,
      default: false,
    },
    isNoShow: {
      type: Boolean,
      default: false,
    },
    studentNoShowExempt: {
      type: Boolean,
      default: false,
    },
    // Financial reconciliation
    financials: {
      earnedAmount: {
        type: Number,
        default: 0,
      },
      penaltyAmount: {
        type: Number,
        default: 0,
      },
      penaltyType: {
        type: String,
        enum: ['none', 'late', 'noshow', 'lmc'],
        default: 'none',
      },
      finalPayout: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Normalize a homework/teacherNotes field:
 * - Old string values (e.g. '') become { content: '', files: [] }
 * - Already-structured values keep their shape
 */
function normalizeRichField(val) {
  if (!val) return { content: '', files: [] };
  if (typeof val === 'string') return { content: val, files: [] };
  return { content: val.content || '', files: val.files || [] };
}

// After a document is loaded from MongoDB, normalize legacy string fields
sessionSchema.post('init', function (doc) {
  doc.homework = normalizeRichField(doc.homework);
  doc.teacherNotes = normalizeRichField(doc.teacherNotes);
});

// Before saving, ensure the fields are objects (not strings)
sessionSchema.pre('save', function (next) {
  this.homework = normalizeRichField(this.homework);
  this.teacherNotes = normalizeRichField(this.teacherNotes);
  next();
});

// Index for efficient queries
sessionSchema.index({ classroom: 1, scheduledDate: 1 });
sessionSchema.index({ classroom: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
