const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
    },
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    teacherLevel: {
      type: String,
      enum: ['Junior', 'Senior', 'Master'],
      default: 'Junior',
    },
    // Legacy root-level fields kept for backward compatibility
    phoneNumber: {
      type: String,
      sparse: true,   // allows multiple docs with no phoneNumber (e.g. Google-only accounts)
      unique: true,
    },
    state: {
      type: String,
    },
    intendedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    dob: {
      type: Date,
    },
    googleId: {
      type: String,
    },
    avatar: {
      type: String,
    },
    // ── Web Push Notification Subscriptions ─────────────
    pushSubscriptions: [{
      endpoint: { type: String, required: true },
      expirationTime: { type: Date, default: null },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    }],
    // ── New nested profile object ──────────────────────
    profile: {
      avatarUrl: {
        type: String,
        default: '',
      },
      phoneNumber: {
        type: String,
        default: '',
      },
      gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'Prefer not to say', ''],
        default: '',
      },
      dob: {
        type: Date,
      },
      bio: {
        type: String,
        maxLength: 500,
        default: '',
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      address: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        zipCode: { type: String, default: '' },
      },
      // Teacher-specific
      qualifications: {
        type: String,
        default: '',
      },
      yearsOfExperience: {
        type: Number,
        default: 0,
      },
      perClassRate: {
        type: Number,
        default: 0,
      },
      // Student-specific
      schoolOrCollege: {
        type: String,
        default: '',
      },
    },
    // ── Password Reset Token ─────────────────────────────
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
    // ── Email Verification ───────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailOtp: {
      type: String,
    },
    emailOtpExpire: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only if password exists and is modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
