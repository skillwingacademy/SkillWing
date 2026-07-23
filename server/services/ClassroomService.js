/**
 * ClassroomService
 *
 * Core business logic for classroom lifecycle.
 * Supports 3 tiers: 1-on-1, Double, Batch.
 */

const Classroom = require('../models/Classroom');
const Session = require('../models/Session');
const Course = require('../models/Course');


/**
 * Map purchasedTier string to the Classroom schema enum and capacity.
 */
function getTierConfig(purchasedTier, course) {
  switch (purchasedTier) {
    case '1-on-1':
      return { classroomType: '1-on-1', maxCapacity: 1 };
    case 'Double':
      return { classroomType: 'Double', maxCapacity: 2 };
    case 'Batch':
      return { classroomType: 'Batch', maxCapacity: course.maxBatchCapacity || 10 };
    default:
      throw new Error(`Invalid tier: ${purchasedTier}`);
  }
}

/**
 * Create or join a classroom after a successful purchase.
 *
 * @param {String} studentId — User ID of the student
 * @param {String} courseId  — Course ID
 * @param {String} purchasedTier — '1-on-1', 'Double', or 'Batch'
 * @param {Object} paymentData — { paymentId, orderId, provider, amount }
 * @returns {Object} Classroom document
 */
async function createClassroom(studentId, courseId, purchasedTier = '1-on-1', paymentData = {}) {
  // Check if student is already enrolled in any active classroom for this course
  const existingEnrollment = await Classroom.findOne({
    course: courseId,
    enrolledStudents: studentId,
    status: { $in: ['active', 'paused'] },
  });

  if (existingEnrollment) {
    console.log(
      `[ClassroomService] Student ${studentId} already enrolled in course ${courseId} (classroom ${existingEnrollment._id})`
    );
    return existingEnrollment;
  }

  // Fetch the course
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const { classroomType, maxCapacity } = getTierConfig(purchasedTier, course);
  const totalSessions = course.courseDetails?.totalSessions || 0;

  // For Double and Batch tiers, try to find an open classroom first
  if (purchasedTier === 'Double' || purchasedTier === 'Batch') {
    const openClassroom = await Classroom.findOne({
      course: courseId,
      classroomType,
      status: 'active',
      $expr: { $lt: [{ $size: '$enrolledStudents' }, '$maxCapacity'] },
    });

    if (openClassroom) {
      // Join existing classroom
      openClassroom.enrolledStudents.push(studentId);
      if (!openClassroom.studentAttendanceStats) openClassroom.studentAttendanceStats = [];
      openClassroom.studentAttendanceStats.push({ studentId, presentCount: 0 });
      await openClassroom.save();

      // Register the new student in all upcoming sessions
      const upcomingSessions = await Session.find({
        classroom: openClassroom._id,
        status: { $in: ['scheduled', 'rescheduled'] },
      });

      for (const session of upcomingSessions) {
        session.studentAttendance.push({
          studentId,
          attendanceStatus: 'pending',
        });
        await session.save();
      }

      console.log(
        `[ClassroomService] Student ${studentId} joined existing ${classroomType} classroom ${openClassroom._id}`
      );

      return openClassroom;
    }
  }

  // No open classroom found (or 1-on-1) — create a new one

  const classroom = await Classroom.create({
    enrolledStudents: [studentId],
    studentAttendanceStats: [{ studentId, presentCount: 0 }],
    teacher: null,
    course: courseId,
    classroomType,
    maxCapacity,
    purchaseDate: new Date(),
    status: 'pending_assignment',
    totalSessions,
    completedSessions: 0,
    nextSessionNumber: 1,
    progressPercentage: 0,
    amountPaid: paymentData.amount || 0,
    paymentId: paymentData.paymentId || '',
    paymentProvider: paymentData.provider || 'mock',
    paymentStatus: 'paid',
  });

  console.log(
    `[ClassroomService] New ${classroomType} classroom created: ${classroom._id} | Student: ${studentId} | Course: ${courseId}`
  );

  return classroom;
}

/**
 * Update classroom progress after a session is marked completed.
 *
 * @param {String} classroomId — Classroom ID
 * @returns {Object} updated Classroom document
 */
async function completeSession(classroomId) {
  const classroom = await Classroom.findById(classroomId);
  if (!classroom) {
    throw new Error('Classroom not found');
  }

  classroom.completedSessions += 1;
  classroom.nextSessionNumber += 1;

  // Recalculate progress
  if (classroom.totalSessions > 0) {
    classroom.progressPercentage = Math.round(
      (classroom.completedSessions / classroom.totalSessions) * 100
    );
  }

  // Auto-complete classroom if all sessions are done
  if (
    classroom.totalSessions > 0 &&
    classroom.completedSessions >= classroom.totalSessions
  ) {
    classroom.status = 'completed';
    classroom.completedAt = new Date();
    console.log(`[ClassroomService] Classroom ${classroomId} marked as completed`);
  }

  // Set startedAt if this is the first completed session
  if (classroom.completedSessions === 1 && !classroom.startedAt) {
    classroom.startedAt = new Date();
  }

  await classroom.save();
  return classroom;
}

/**
 * Recounts and updates present counts for all enrolled students in the classroom schema.
 *
 * @param {String} classroomId — Classroom ID
 * @returns {Object} updated Classroom document
 */
async function updateClassroomAttendanceStats(classroomId) {
  const classroom = await Classroom.findById(classroomId);
  if (!classroom) return null;

  const sessions = await Session.find({ classroom: classroomId });
  const presentCounts = {};

  for (const session of sessions) {
    if (session.studentAttendance && Array.isArray(session.studentAttendance)) {
      for (const sa of session.studentAttendance) {
        if (sa.attendanceStatus === 'present' && sa.studentId) {
          const sId = sa.studentId.toString();
          presentCounts[sId] = (presentCounts[sId] || 0) + 1;
        }
      }
    }
  }

  const stats = [];
  const studentIds = classroom.enrolledStudents || [];
  for (const s of studentIds) {
    const sId = s._id ? s._id.toString() : s.toString();
    stats.push({
      studentId: sId,
      presentCount: presentCounts[sId] || 0,
    });
  }

  classroom.studentAttendance = stats;
  await classroom.save();
  return classroom;
}

module.exports = { createClassroom, completeSession, updateClassroomAttendanceStats };
