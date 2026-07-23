const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * PendingRegistration — temporary store for registrations awaiting email OTP.
 * Documents auto-delete after 30 minutes via the TTL index on `createdAt`.
 */
const pendingRegistrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  hashedPassword: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], default: 'student' },
  phoneNumber: { type: String, default: '' },
  state: { type: String, default: '' },
  intendedCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  dob: { type: Date },
  hashedOtp: { type: String, required: true },
  otpExpire: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, expires: 1800 }, // TTL: 30 minutes
});

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema);
