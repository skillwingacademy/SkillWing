require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Trust proxy required for express-rate-limit when hosted on Render
app.set('trust proxy', 1);

// ──────────────────────────────────────────────
// Global Middleware
// ──────────────────────────────────────────────

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Security headers
app.use(helmet());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
});
app.use('/api', limiter);

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const classSessionRoutes = require('./routes/classSessionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const configRoutes = require('./routes/configRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sessions', classSessionRoutes);   // legacy — kept for backward compat
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/config', configRoutes);

// Legacy: local file serving for uploads (avatars now stored in Google Cloud Storage)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'SkillWing API is running' });
});

// ──────────────────────────────────────────────
// Global Error Handler
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ──────────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SkillWing server running on port ${PORT}`);

  // Start Zoom telemetry polling scheduler (graceful — never crashes the app)
  try {
    const { startZoomTelemetryScheduler } = require('./schedulers/ZoomTelemetryScheduler');
    startZoomTelemetryScheduler();
  } catch (err) {
    console.warn('[Server] Zoom telemetry scheduler could not be loaded:', err.message);
    console.warn('[Server] The app will continue running without automatic Zoom telemetry polling.');
  }

  // Start class reminder cron (every 15 minutes)
  try {
    const { startReminderCron } = require('./schedulers/ReminderCron');
    startReminderCron();
  } catch (err) {
    console.warn('[Server] Reminder cron could not be loaded:', err.message);
    console.warn('[Server] The app will continue running without class reminders.');
  }
});

