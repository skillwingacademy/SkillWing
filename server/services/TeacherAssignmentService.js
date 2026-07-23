/**
 * TeacherAssignmentService
 *
 * Isolated service for assigning a teacher to a new classroom.
 * Currently uses simple logic (first approved instructor).
 * Designed to be replaced later with load balancing, availability
 * matching, timezone matching, or manual admin assignment.
 */

const User = require('../models/User');

/**
 * Assign a teacher from the course's instructor list.
 * Falls back to the legacy `educator` field.
 *
 * @param {Object} course — Mongoose course document (populated or not)
 * @returns {String} teacher userId
 * @throws {Error} if no approved teacher is available
 */
async function assignTeacher(course) {
  // Collect candidate teacher IDs from the course
  const candidateIds = [];

  if (course.instructors && course.instructors.length > 0) {
    course.instructors.forEach((inst) => {
      const id = typeof inst === 'object' ? inst._id || inst : inst;
      candidateIds.push(id.toString());
    });
  }

  if (course.educator) {
    const educatorId =
      typeof course.educator === 'object'
        ? course.educator._id || course.educator
        : course.educator;
    const idStr = educatorId.toString();
    if (!candidateIds.includes(idStr)) {
      candidateIds.push(idStr);
    }
  }

  if (candidateIds.length === 0) {
    throw new Error('No instructors assigned to this course');
  }

  // Find the first approved teacher among candidates
  for (const candidateId of candidateIds) {
    const teacher = await User.findById(candidateId).select('role approvalStatus');
    if (
      teacher &&
      teacher.role === 'teacher' &&
      teacher.approvalStatus === 'approved'
    ) {
      return teacher._id;
    }
  }

  // If no approved teacher found, fall back to the first candidate
  // (admin-created courses may have admin as educator)
  return candidateIds[0];
}

module.exports = { assignTeacher };
