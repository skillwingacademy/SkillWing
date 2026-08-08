/* API smoke test — exercises every route, reports pass/fail.
   Usage: node scripts/api-test.js  (server must be running on PORT 5001)
   Uses throwaway test users (student/teacher/admin) created per run. */
require('dotenv').config();
const axios = require('axios');

const BASE = 'http://127.0.0.1:5001';
const api = axios.create({ baseURL: BASE, validateStatus: () => true });

let results = [];
const SUFFIX = Date.now().toString().slice(-6);

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark.padEnd(5)} ${name}${detail ? '  → ' + detail : ''}`);
}

async function post(path, body, token) {
  return api.post(path, body, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
}
async function get(path, token) {
  return api.get(path, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
}
async function put(path, body, token) {
  return api.put(path, body, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
}
async function del(path, token) {
  return api.delete(path, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
}

const ok2xx = (r) => r.status >= 200 && r.status < 300;

async function main() {
  // ── Health / config ──
  let r = await get('/api/health');
  record('GET /api/health', ok2xx(r), r.status);

  r = await get('/api/config/detect-location');
  record('GET /api/config/detect-location', ok2xx(r), r.status);

  // ── Auth: register student & teacher ──
  const studentEmail = `api.student${SUFFIX}@skillsphere.com`;
  const teacherEmail = `api.teacher${SUFFIX}@skillsphere.com`;
  const adminEmail = `api.admin${SUFFIX}@skillsphere.com`;
  const password = 'Test@1234';
  const phone = `99999${SUFFIX}`;

  r = await post('/api/auth/register', { name: 'API Student', email: studentEmail, password, role: 'student', phoneNumber: phone });
  record('POST /api/auth/register (student)', r.status === 201, `${r.status} ${r.data?.message || ''}`);

  r = await post('/api/auth/register', { name: 'API Teacher', email: teacherEmail, password, role: 'teacher', phoneNumber: '8888' + SUFFIX });
  record('POST /api/auth/register (teacher)', r.status === 201, `${r.status} ${r.data?.message || ''}`);

  // Admin role is not assignable via register (register only accepts student/teacher).
  // Create a real admin directly in the DB so admin routes can be exercised.
  const mongoose = require('mongoose');
  const User = require('../models/User');
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteOne({ email: adminEmail });
  const admin = await User.create({
    name: 'API Admin',
    email: adminEmail,
    password,
    role: 'admin',
    approvalStatus: 'approved',
    phoneNumber: '7777' + SUFFIX,
  });
  record('create admin (db)', !!admin._id, admin._id);

  // ── Login all three ──
  const studentLogin = await post('/api/auth/login', { emailOrPhone: studentEmail, password });
  const teacherLogin = await post('/api/auth/login', { emailOrPhone: teacherEmail, password });
  const adminLogin = await post('/api/auth/login', { emailOrPhone: adminEmail, password });
  record('POST /api/auth/login (student)', ok2xx(studentLogin), `${studentLogin.status} ${studentLogin.data?.message || ''}`);
  record('POST /api/auth/login (teacher)', ok2xx(teacherLogin), teacherLogin.status);
  record('POST /api/auth/login (admin)', ok2xx(adminLogin), adminLogin.status);

  const sToken = studentLogin.data?.data?.token;
  const tToken = teacherLogin.data?.data?.token;
  const aToken = adminLogin.data?.data?.token;

  r = await get('/api/auth/me', sToken);
  record('GET /api/auth/me', ok2xx(r), r.status);

  r = await post('/api/auth/forgot-password', { email: studentEmail });
  record('POST /api/auth/forgot-password', ok2xx(r) || r.status === 404, r.status);

  // ── Courses (public) ──
  r = await get('/api/courses');
  record('GET /api/courses', ok2xx(r), `${r.status} (${Array.isArray(r.data?.data) ? r.data.data.length : '?'} courses)`);

  const courseId = r.data?.data?.[0]?._id;
  if (courseId) {
    r = await get(`/api/courses/${courseId}`);
    record('GET /api/courses/:id', ok2xx(r), r.status);
  } else {
    record('GET /api/courses/:id', false, 'no course found to test');
  }

  // ── Students ──
  for (const p of ['/api/student/classrooms', '/api/student/upcoming-class', '/api/student/today-class', '/api/student/past-classes', '/api/student/progress']) {
    r = await get(p, sToken);
    record(`GET ${p}`, ok2xx(r), r.status);
  }

  // ── Teacher ──
  const now = new Date();
  r = await get(`/api/teacher/payouts?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, tToken);
  record('GET /api/teacher/payouts', ok2xx(r), `${r.status} ${r.data?.message || ''}`);

  // ── Classrooms ──
  r = await get('/api/classrooms/teacher', tToken);
  record('GET /api/classrooms/teacher', ok2xx(r), r.status);

  // Seed a classroom if the teacher has none, so :id routes can be tested.
  const Classroom = require('../models/Classroom');
  let classroom = r.data?.data?.[0] || r.data?.[0];
  if (!classroom && courseId) {
    const teacherUser = await User.findOne({ email: teacherEmail });
    const studentUser = await User.findOne({ email: studentEmail });
    const seeded = await Classroom.create({
      course: courseId,
      teacher: teacherUser._id,
      enrolledStudents: [studentUser._id],
      classroomType: '1-on-1',
      maxCapacity: 2,
      status: 'active',
      totalSessions: 5,
    });
    classroom = seeded;
    record('seed classroom', !!seeded._id, seeded._id);
  }
  const classroomId = classroom?._id;
  if (classroomId) {
    r = await get(`/api/classrooms/${classroomId}`, sToken);
    record('GET /api/classrooms/:id', ok2xx(r), r.status);
    r = await get(`/api/classrooms/${classroomId}/details`, sToken);
    record('GET /api/classrooms/:id/details', ok2xx(r), r.status);
  } else {
    record('GET /api/classrooms/:id + details', false, 'no classroom found');
  }

  // ── Sessions ──
  const sessionId = null;
  if (courseId) {
    r = await get(`/api/sessions/course/${courseId}`, sToken);
    record('GET /api/sessions/course/:id', ok2xx(r), r.status);
  }
  r = await get('/api/sessions/teacher/schedule', tToken);
  record('GET /api/sessions/teacher/schedule', ok2xx(r), r.status);

  // ── Chat ──
  r = await get('/api/chat/contacts', sToken);
  record('GET /api/chat/contacts', ok2xx(r), r.status);
  r = await get('/api/chat/unread-count', sToken);
  record('GET /api/chat/unread-count', ok2xx(r), r.status);
  r = await get('/api/chat/conversations', sToken);
  record('GET /api/chat/conversations', ok2xx(r), r.status);

  // ── Notifications ──
  r = await get('/api/notifications/vapid-public-key', sToken);
  record('GET /api/notifications/vapid-public-key', ok2xx(r), r.status);
  r = await post('/api/notifications/subscribe', { subscription: { endpoint: 'https://example.com/push', keys: { p256dh: 'x', auth: 'y' }, expirationTime: null } }, sToken);
  record('POST /api/notifications/subscribe', ok2xx(r) || r.status === 400, r.status);
  r = await del('/api/notifications/unsubscribe', sToken);
  record('DELETE /api/notifications/unsubscribe', ok2xx(r) || r.status === 400, r.status);

  // ── Demo (student) ──
  r = await get('/api/demo/my-requests', sToken);
  record('GET /api/demo/my-requests', ok2xx(r), r.status);

  // ── User profile ──
  r = await get('/api/users/profile', sToken);
  record('GET /api/users/profile', ok2xx(r), r.status);
  r = await put('/api/users/profile', { name: 'API Student Updated' }, sToken);
  record('PUT /api/users/profile', ok2xx(r), r.status);

  // ── Admin-only (teacher token should be rejected) ──
  r = await get('/api/admin/teachers/pending', tToken);
  record('GET /api/admin/teachers/pending (teacher→reject)', r.status === 403 || r.status === 401, `${r.status} ${r.data?.message || ''}`);
  r = await get('/api/admin/teachers/pending', aToken);
  record('GET /api/admin/teachers/pending (admin)', ok2xx(r), r.status);
  r = await get('/api/admin/teachers/approved', aToken);
  record('GET /api/admin/teachers/approved (admin)', ok2xx(r), r.status);
  r = await get('/api/admin/students', aToken);
  record('GET /api/admin/students', ok2xx(r), r.status);
  r = await get('/api/admin/classrooms', aToken);
  record('GET /api/admin/classrooms', ok2xx(r), r.status);
  for (const p of ['/api/admin/stats/classrooms', '/api/admin/stats/sessions', '/api/admin/stats/teacher-workload']) {
    r = await get(p, aToken);
    record(`GET ${p}`, ok2xx(r), r.status);
  }
  r = await get(`/api/admin/payouts?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, aToken);
  record('GET /api/admin/payouts', ok2xx(r), r.status);
  r = await get('/api/admin/teacher-rates', aToken);
  record('GET /api/admin/teacher-rates', ok2xx(r), r.status);
  r = await get('/api/demo/admin/requests', aToken);
  record('GET /api/demo/admin/requests', ok2xx(r), r.status);
  r = await get('/api/chat/admin/all-conversations', aToken);
  record('GET /api/chat/admin/all-conversations', ok2xx(r), r.status);

  // ── Payment (create order — expect config or payload validation) ──
  r = await post('/api/payments/create-order', { amount: 100, currency: 'INR', courseId }, sToken);
  record('POST /api/payments/create-order', ok2xx(r) || r.status === 400 || r.status === 404, `${r.status} ${r.data?.message || ''}`);
  r = await post('/api/demo/create-order', { courseId }, sToken);
  record('POST /api/demo/create-order', ok2xx(r) || r.status === 400 || r.status === 404, `${r.status} ${r.data?.message || ''}`);

  // ── Summary ──
  const passed = results.filter(x => x.ok).length;
  const failed = results.filter(x => !x.ok).length;
  console.log('\n========================================');
  console.log(`TOTAL: ${results.length}  PASS: ${passed}  FAIL: ${failed}`);
  console.log('========================================');
  if (failed) {
    console.log('\nFAILED:');
    results.filter(x => !x.ok).forEach(x => console.log(`  ✗ ${x.name}  → ${x.detail}`));
  }
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });
