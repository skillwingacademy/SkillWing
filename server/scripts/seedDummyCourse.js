/**
 * Seed script — inserts a dummy course with all expanded fields.
 * Run:  node scripts/seedDummyCourse.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Course = require('../models/Course');

const MONGO_URI = process.env.MONGO_URI;

const dummyCourse = {
  title: 'Full-Stack Web Development Bootcamp',
  description:
    'Master the MERN stack from scratch. This intensive bootcamp covers everything from HTML, CSS, and JavaScript fundamentals to advanced React patterns, Node.js microservices, MongoDB aggregation pipelines, and cloud deployment on AWS. You will build 5 production-grade projects including an e-commerce platform, a real-time chat application, and a social media dashboard. Each week includes live coding sessions, code reviews, and 1-on-1 mentorship calls to ensure you stay on track.',
  introduction:
    'Kickstart your career in tech with our most comprehensive web development program. Designed for absolute beginners and career-switchers, this bootcamp takes you from zero to job-ready in just 12 weeks with hands-on projects and live mentorship.',
  price: 49900, // ₹499.00 in paise
  currency: 'INR',
  thumbnailImage: '',
  instructors: [], // No real teacher IDs yet — will display as empty
  courseDetails: {
    batchTypes: ['Weekend', 'Weekday Evening', 'Fast-Track Intensive'],
    totalSessions: 48,
    duration: '12 Weeks',
    skillLevel: 'Beginner',
    language: 'English',
  },
  whatYouWillReceive: [
    'Certificate of Completion',
    '1-on-1 Mentorship Sessions',
    'Lifetime Access to Course Materials',
    '5 Production-Grade Projects for Portfolio',
    'Resume & Interview Preparation',
    'Access to Private Discord Community',
    'Weekly Live Q&A Sessions',
  ],
  isActive: true,
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const created = await Course.create(dummyCourse);
    console.log(`\n✅ Dummy course created!`);
    console.log(`   ID:    ${created._id}`);
    console.log(`   Title: ${created.title}`);
    console.log(`   URL:   http://localhost:5173/courses/${created._id}\n`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
