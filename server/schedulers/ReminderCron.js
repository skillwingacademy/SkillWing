const cron = require('node-cron');
const Session = require('../models/Session');
const Classroom = require('../models/Classroom');
const { sendPushToUser } = require('../controllers/notificationController');
const { db } = require('../services/firebaseService');
const sendEmail = require('../utils/sendEmail');

/**
 * Reminder Cron — runs every 15 minutes.
 *
 * Finds sessions starting in approximately 2 hours (±15 min window)
 * and sends:
 *   1. A Web Push notification to the teacher + enrolled students.
 *   2. A branded HTML reminder email via Nodemailer (Promise-wrapped).
 *
 * Each session is only notified once via the `reminderSent` flag.
 */

let isRunning = false;

// ─── HTML Email Builder ────────────────────────────────────────────────────────
/**
 * Build a branded reminder email for a single recipient.
 * @param {string} recipientName
 * @param {string} sessionTitle
 * @param {string} startTimeStr  - formatted time string
 * @param {string} dateStr       - formatted date string
 * @param {'student'|'teacher'} role
 * @returns {{ html: string, text: string }}
 */
function buildReminderEmail(recipientName, sessionTitle, startTimeStr, dateStr, role) {
  const year = new Date().getFullYear();
  const roleNote = role === 'teacher'
    ? 'Your students are looking forward to this session. Please ensure your setup is ready before the class begins.'
    : 'Please log in to your SkillWing dashboard a few minutes early so you are ready when the class begins.';

  const dashboardUrl = (process.env.CLIENT_URL || '').replace(/\/+$/, '') + (
    role === 'teacher' ? '/teacher/dashboard' : '/dashboard'
  );

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>SkillWing — Class Reminder</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#bfdbfe;letter-spacing:2px;text-transform:uppercase;font-weight:700;">SkillWing Academy</p>
            <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">⏰ Class Reminder</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:36px 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">Hi ${recipientName},</p>
            <p style="margin:14px 0 0;font-size:15px;color:#475569;line-height:1.7;">
              This is a reminder that your upcoming class is starting in about <strong style="color:#1e293b;">2 hours</strong>.
            </p>

            <!-- Session Info Card -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="margin:28px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;border-left:4px solid #2563eb;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Session</p>
                  <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#0f172a;">${sessionTitle}</p>
                  <table cellpadding="0" cellspacing="0" style="margin-top:14px;">
                    <tr>
                      <td style="padding-right:32px;">
                        <p style="margin:0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;">Date</p>
                        <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#334155;">📅 ${dateStr}</p>
                      </td>
                      <td>
                        <p style="margin:0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;">Time</p>
                        <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#334155;">🕐 ${startTimeStr}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">${roleNote}</p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
              <tr>
                <td align="center">
                  <a href="${dashboardUrl}" target="_blank"
                    style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(37,99,235,0.35);">
                    Go to Dashboard →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer note -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
            <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
              You are receiving this email because you are enrolled in a SkillWing class.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              © ${year} SkillWing Academy. All rights reserved.<br/>
              Anandnagar, Giridih, Jharkhand — 815301, India
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${recipientName},\n\nThis is a reminder that your class "${sessionTitle}" is starting in about 2 hours.\n\nDate: ${dateStr}\nTime: ${startTimeStr}\n\n${roleNote}\n\nVisit your dashboard: ${dashboardUrl}\n\nRegards,\nThe SkillWing Team`;

  return { html, text };
}

// ─── Main Cycle ────────────────────────────────────────────────────────────────
async function runReminderCycle() {
  if (isRunning) {
    console.log('[ReminderCron] Previous cycle still running, skipping');
    return;
  }

  isRunning = true;

  try {
    const now = new Date();
    // Window: sessions starting between 1h45m and 2h15m from now
    const windowStart = new Date(now.getTime() + 105 * 60 * 1000); // +1h45m
    const windowEnd   = new Date(now.getTime() + 135 * 60 * 1000); // +2h15m

    const sessions = await Session.find({
      status: 'scheduled',
      reminderSent: { $ne: true },
      startTime: { $gte: windowStart, $lte: windowEnd },
    })
      .select('_id title sessionNumber startTime classroom')
      .limit(50);

    if (sessions.length === 0) {
      isRunning = false;
      return;
    }

    console.log(`[ReminderCron] Found ${sessions.length} session(s) starting in ~2 hours`);

    for (const session of sessions) {
      try {
        // Load the classroom with teacher and students populated
        const classroom = await Classroom.findById(session.classroom)
          .populate('teacher', 'name email')
          .populate('enrolledStudents', 'name email')
          .select('teacher enrolledStudents')
          .lean();

        if (!classroom) {
          console.warn(`[ReminderCron] Classroom not found for session ${session._id}`);
          continue;
        }

        // Format time and date strings
        const sessionDate = new Date(session.startTime);
        const startTimeStr = sessionDate.toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
        });
        const dateStr = sessionDate.toLocaleDateString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          timeZone: 'Asia/Kolkata',
        });
        const sessionTitle = session.title || `Session ${session.sessionNumber}`;

        const pushPayload = {
          title: 'Upcoming Class Reminder ⏰',
          body: `"${sessionTitle}" starts at ${startTimeStr}!`,
          icon: '/images/logo192.png',
          url: `/dashboard`,
        };

        // ── Teacher ─────────────────────────────────────────────────────────
        if (classroom.teacher) {
          const teacher = classroom.teacher;

          // Push notification
          await sendPushToUser(teacher._id.toString(), pushPayload);

          // Email reminder (Promise-wrapped sendEmail)
          if (teacher.email) {
            const { html, text } = buildReminderEmail(
              teacher.name || 'Teacher',
              sessionTitle, startTimeStr, dateStr, 'teacher'
            );
            sendEmail({
              email: teacher.email,
              subject: `⏰ Reminder: "${sessionTitle}" starts in 2 hours`,
              html,
              text,
            }).catch(err =>
              console.error(`[ReminderCron] Email failed for teacher ${teacher.email}:`, err.message)
            );
          }
        }

        // ── Students ─────────────────────────────────────────────────────────
        const students = classroom.enrolledStudents || [];
        for (const student of students) {
          // Push notification
          await sendPushToUser(student._id.toString(), pushPayload);

          // Email reminder (Promise-wrapped sendEmail)
          if (student.email) {
            const { html, text } = buildReminderEmail(
              student.name || 'Student',
              sessionTitle, startTimeStr, dateStr, 'student'
            );
            sendEmail({
              email: student.email,
              subject: `⏰ Reminder: "${sessionTitle}" starts in 2 hours`,
              html,
              text,
            }).catch(err =>
              console.error(`[ReminderCron] Email failed for student ${student.email}:`, err.message)
            );
          }
        }

        // ── Legacy: Firebase Trigger Email (kept as fallback if db is configured) ──
        const userEmails = [];
        if (classroom.teacher?.email) userEmails.push(classroom.teacher.email);
        students.forEach(s => { if (s.email) userEmails.push(s.email); });

        if (db && userEmails.length > 0) {
          for (const email of userEmails) {
            try {
              await db.collection('mail').add({
                to: email,
                message: {
                  subject: `⏰ Reminder: "${sessionTitle}" starts in 2 hours`,
                  html: `<p>Your class <strong>${sessionTitle}</strong> starts at <strong>${startTimeStr}</strong> on ${dateStr}. Please log in to your dashboard.</p>`,
                },
              });
            } catch (mailErr) {
              console.error(`[ReminderCron] Firebase email error for ${email}:`, mailErr.message);
            }
          }
        }

        // Mark session so we don't send again
        await Session.updateOne({ _id: session._id }, { reminderSent: true });

        const totalUsers = (classroom.teacher ? 1 : 0) + students.length;
        console.log(`[ReminderCron] Sent reminder for session "${sessionTitle}" to ${totalUsers} user(s)`);
      } catch (err) {
        console.error(`[ReminderCron] Error processing session ${session._id}:`, err.message);
      }
    }

    console.log(`[ReminderCron] Completed reminder cycle for ${sessions.length} session(s)`);
  } catch (err) {
    console.error('[ReminderCron] Cycle error:', err.message);
  } finally {
    isRunning = false;
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
/**
 * Start the reminder cron. Runs every 15 minutes.
 */
function startReminderCron() {
  try {
    if (!cron || !cron.schedule) {
      console.warn('[ReminderCron] node-cron not available. Reminders disabled.');
      return;
    }

    cron.schedule('*/15 * * * *', runReminderCycle, {
      scheduled: true,
      timezone: 'Asia/Kolkata',
    });

    console.log('[ReminderCron] ✓ Reminder cron started (every 15 minutes)');
  } catch (err) {
    console.error('[ReminderCron] Failed to start:', err.message);
    console.warn('[ReminderCron] The app will continue running without class reminders.');
  }
}

module.exports = { startReminderCron, runReminderCycle };
