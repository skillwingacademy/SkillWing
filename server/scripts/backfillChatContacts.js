/**
 * backfillChatContacts.js
 * 
 * One-time script: reads all existing active classrooms and creates
 * ChatContact adjacency entries for every teacher↔student pair.
 * 
 * Run with: node server/scripts/backfillChatContacts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const ChatContact = require('../models/ChatContact');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const classrooms = await Classroom.find({
    teacher: { $ne: null },
    enrolledStudents: { $exists: true, $ne: [] },
  }).select('teacher enrolledStudents status');

  console.log(`Found ${classrooms.length} classrooms with a teacher assigned.`);

  let created = 0;
  let skipped = 0;

  for (const classroom of classrooms) {
    const teacherId = classroom.teacher.toString();

    for (const studentId of classroom.enrolledStudents) {
      const sid = studentId.toString();

      // teacher → student
      const r1 = await ChatContact.findOneAndUpdate(
        { userId: teacherId, contactId: sid },
        { userId: teacherId, contactId: sid, classroomId: classroom._id },
        { upsert: true, new: true }
      );

      // student → teacher
      const r2 = await ChatContact.findOneAndUpdate(
        { userId: sid, contactId: teacherId },
        { userId: sid, contactId: teacherId, classroomId: classroom._id },
        { upsert: true, new: true }
      );

      created += 2;
      console.log(`  ✓ Linked teacher ${teacherId} ↔ student ${sid} (classroom: ${classroom._id})`);
    }
  }

  console.log(`\nDone! Created/updated ${created} ChatContact entries.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
