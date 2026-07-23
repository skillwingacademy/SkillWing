/**
 * Seed script — inserts realistic dummy payout sessions for teachers so you can test and view the Payout Dashboard right away.
 * Run: node scripts/seedDummyPayouts.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Course = require('../models/Course');
const Classroom = require('../models/Classroom');
const Session = require('../models/Session');

const MONGO_URI = process.env.MONGO_URI;

async function seedPayouts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Find or create dummy Course
    let course = await Course.findOne({ title: 'Full-Stack Web Development Bootcamp' });
    if (!course) {
      course = await Course.create({
        title: 'Full-Stack Web Development Bootcamp',
        description: 'Comprehensive MERN Stack Bootcamp.',
        price: 49900,
        currency: 'INR',
        courseDetails: {
          batchTypes: ['1-on-1', 'Batch'],
          totalSessions: 48,
          duration: '12 Weeks',
          skillLevel: 'Beginner',
          language: 'English',
        },
        isActive: true,
      });
      console.log('✅ Created Course:', course.title);
    } else {
      console.log('✓ Found Course:', course.title);
    }

    // 2. Find or create dummy Student
    let student = await User.findOne({ email: 'student.test@skillsphere.com' });
    if (!student) {
      student = await User.create({
        name: 'Aarav Sharma (Test Student)',
        email: 'student.test@skillsphere.com',
        password: 'password123',
        role: 'student',
        approvalStatus: 'approved',
      });
      console.log('✅ Created Student:', student.email);
    } else {
      console.log('✓ Found Student:', student.email);
    }

    // 3. Find or create test Teacher AND get all existing approved teachers
    let testTeacher = await User.findOne({ email: 'teacher.test@skillsphere.com' });
    if (!testTeacher) {
      testTeacher = await User.create({
        name: 'Rohan Verma (Test Teacher)',
        email: 'teacher.test@skillsphere.com',
        password: 'password123',
        role: 'teacher',
        approvalStatus: 'approved',
        profile: {
          perClassRate: 1500,
          qualifications: 'M.Tech Computer Science, IIT Delhi',
          yearsOfExperience: 6,
          bio: 'Senior Full Stack Instructor specialising in React and Node.js.',
        },
      });
      console.log('✅ Created Test Teacher:', testTeacher.email);
    } else {
      // Ensure perClassRate is set
      if (!testTeacher.profile || !testTeacher.profile.perClassRate) {
        testTeacher.profile = { ...testTeacher.profile, perClassRate: 1500 };
        await testTeacher.save();
      }
      console.log('✓ Found Test Teacher:', testTeacher.email);
    }

    // Also find any other teachers in DB so we seed for them too if desired
    const allTeachers = await User.find({ role: 'teacher', approvalStatus: 'approved' });
    console.log(`\nFound ${allTeachers.length} approved teacher(s) in database. Seeding payout data...`);

    // Drop legacy index if it exists in MongoDB so modern enrolledStudents array works without dup key errors
    try {
      await Classroom.collection.dropIndex('student_1_course_1');
      console.log('✓ Dropped legacy index student_1_course_1');
    } catch (idxErr) {
      // Ignore if index doesn't exist
    }

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth(); // 0-indexed

    for (const teacher of allTeachers) {
      const rate = teacher.profile?.perClassRate || 1500;
      if (!teacher.profile?.perClassRate) {
        teacher.profile = { ...teacher.profile, perClassRate: rate };
        await teacher.save();
      }

      // Create or find a Classroom for this teacher
      let classroom = await Classroom.findOne({ teacher: teacher._id, course: course._id });
      if (!classroom) {
        // Also set legacy 'student' field via collection insert or Mongoose (by temporary schema extension or direct save) to avoid old unique index constraints if not droppable
        classroom = await Classroom.create({
          teacher: teacher._id,
          course: course._id,
          student: student._id, // legacy fallback if index remains
          enrolledStudents: [student._id],
          classroomType: '1-on-1',
          maxCapacity: 1,
          status: 'active',
          totalSessions: 12,
          completedSessions: 6,
          progressPercentage: 50,
        });
      }

      // Remove any existing dummy sessions created by this script for clean re-runs
      await Session.deleteMany({
        classroom: classroom._id,
        title: { $regex: /^\[Dummy Payout\]/ },
      });

      // Generate 6 sessions in the CURRENT month/year
      const sessionsData = [
        {
          classroom: classroom._id,
          sessionNumber: 1,
          title: '[Dummy Payout] Session 1 - Full Pay (Normal)',
          scheduledDate: new Date(Date.UTC(currentYear, currentMonth, 2, 10, 0)),
          startTime: new Date(Date.UTC(currentYear, currentMonth, 2, 10, 0)),
          endTime: new Date(Date.UTC(currentYear, currentMonth, 2, 11, 0)),
          status: 'completed',
          meetingStatus: 'completed',
          snapshotRate: rate,
          actualTeacherJoinTime: new Date(Date.UTC(currentYear, currentMonth, 2, 9, 58)),
          actualStudentJoinTime: new Date(Date.UTC(currentYear, currentMonth, 2, 10, 1)),
          isTeacherLate: false,
          isNoShow: false,
          studentNoShowExempt: false,
          financials: {
            earnedAmount: rate,
            penaltyAmount: 0,
            penaltyType: 'none',
            finalPayout: rate,
          },
        },
        {
          classroom: classroom._id,
          sessionNumber: 2,
          title: '[Dummy Payout] Session 2 - Teacher Late (₹300 Penalty)',
          scheduledDate: new Date(Date.UTC(currentYear, currentMonth, 5, 14, 0)),
          startTime: new Date(Date.UTC(currentYear, currentMonth, 5, 14, 0)),
          endTime: new Date(Date.UTC(currentYear, currentMonth, 5, 15, 0)),
          status: 'completed',
          meetingStatus: 'completed',
          snapshotRate: rate,
          actualTeacherJoinTime: new Date(Date.UTC(currentYear, currentMonth, 5, 14, 8)), // Joined 8 mins late (> 5m threshold)
          actualStudentJoinTime: new Date(Date.UTC(currentYear, currentMonth, 5, 14, 0)),
          isTeacherLate: true,
          isNoShow: false,
          studentNoShowExempt: false,
          financials: {
            earnedAmount: rate,
            penaltyAmount: 300,
            penaltyType: 'late',
            finalPayout: rate - 300,
          },
        },
        {
          classroom: classroom._id,
          sessionNumber: 3,
          title: '[Dummy Payout] Session 3 - Teacher No-Show (₹600 Penalty)',
          scheduledDate: new Date(Date.UTC(currentYear, currentMonth, 8, 11, 0)),
          startTime: new Date(Date.UTC(currentYear, currentMonth, 8, 11, 0)),
          endTime: new Date(Date.UTC(currentYear, currentMonth, 8, 12, 0)),
          status: 'completed',
          meetingStatus: 'completed',
          snapshotRate: rate,
          actualTeacherJoinTime: null, // Never joined
          actualStudentJoinTime: new Date(Date.UTC(currentYear, currentMonth, 8, 11, 2)),
          isTeacherLate: false,
          isNoShow: true,
          studentNoShowExempt: false,
          financials: {
            earnedAmount: 0,
            penaltyAmount: 600,
            penaltyType: 'noshow',
            finalPayout: -600,
          },
        },
        {
          classroom: classroom._id,
          sessionNumber: 4,
          title: '[Dummy Payout] Session 4 - Late Minute Cancellation (₹400 LMC Penalty)',
          scheduledDate: new Date(Date.UTC(currentYear, currentMonth, 12, 16, 0)),
          startTime: new Date(Date.UTC(currentYear, currentMonth, 12, 16, 0)),
          endTime: new Date(Date.UTC(currentYear, currentMonth, 12, 17, 0)),
          status: 'cancelled',
          meetingStatus: 'pending',
          cancellationReason: 'Emergency cancellation by teacher 2 hours before class (<4h LMC rule)',
          snapshotRate: rate,
          isTeacherLate: false,
          isNoShow: false,
          studentNoShowExempt: false,
          financials: {
            earnedAmount: 0,
            penaltyAmount: 400,
            penaltyType: 'lmc',
            finalPayout: -400,
          },
        },
        {
          classroom: classroom._id,
          sessionNumber: 5,
          title: '[Dummy Payout] Session 5 - Student No-Show Exempt (Full Pay)',
          scheduledDate: new Date(Date.UTC(currentYear, currentMonth, 15, 10, 0)),
          startTime: new Date(Date.UTC(currentYear, currentMonth, 15, 10, 0)),
          endTime: new Date(Date.UTC(currentYear, currentMonth, 15, 11, 0)),
          status: 'completed',
          meetingStatus: 'completed',
          snapshotRate: rate,
          actualTeacherJoinTime: new Date(Date.UTC(currentYear, currentMonth, 15, 9, 59)),
          actualStudentJoinTime: null, // Student never joined, teacher waited 20+ mins
          isTeacherLate: false,
          isNoShow: false,
          studentNoShowExempt: true,
          financials: {
            earnedAmount: rate,
            penaltyAmount: 0,
            penaltyType: 'none',
            finalPayout: rate,
          },
        },
        {
          classroom: classroom._id,
          sessionNumber: 6,
          title: '[Dummy Payout] Session 6 - Full Pay (Normal)',
          scheduledDate: new Date(Date.UTC(currentYear, currentMonth, 18, 15, 0)),
          startTime: new Date(Date.UTC(currentYear, currentMonth, 18, 15, 0)),
          endTime: new Date(Date.UTC(currentYear, currentMonth, 18, 16, 0)),
          status: 'completed',
          meetingStatus: 'completed',
          snapshotRate: rate,
          actualTeacherJoinTime: new Date(Date.UTC(currentYear, currentMonth, 18, 14, 57)),
          actualStudentJoinTime: new Date(Date.UTC(currentYear, currentMonth, 18, 15, 0)),
          isTeacherLate: false,
          isNoShow: false,
          studentNoShowExempt: false,
          financials: {
            earnedAmount: rate,
            penaltyAmount: 0,
            penaltyType: 'none',
            finalPayout: rate,
          },
        },
      ];

      await Session.insertMany(sessionsData);
      console.log(`✅ Seeded 6 realistic sessions for Teacher: ${teacher.name} (${teacher.email}) [Rate: ₹${rate}]`);
    }

    console.log('\n======================================================');
    console.log('🎯 SEEDING COMPLETE! How to check your Payout Dashboard:');
    console.log('======================================================');
    console.log(`Month/Year: ${now.toLocaleString('en-IN', { month: 'long' })} ${currentYear}`);
    console.log('\n1. AS ADMIN:');
    console.log('   - Go to http://localhost:5173/admin/payouts');
    console.log('   - You will see the breakdown chart, table, and filter by teacher.');
    console.log('\n2. AS TEACHER:');
    console.log('   - Go to http://localhost:5173/teacher/payouts');
    console.log('   - Log in with test credentials if needed:');
    console.log('       Email:    teacher.test@skillsphere.com');
    console.log('       Password: password123');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedPayouts();
