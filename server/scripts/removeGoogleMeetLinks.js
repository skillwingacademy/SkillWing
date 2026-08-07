/**
 * Removes retired Google Meet fields from classroom Session documents.
 *
 * Preview: npm run migrate:remove-google-meet
 * Execute: npm run migrate:remove-google-meet -- --execute
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function removeGoogleMeetLinks() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const sessions = mongoose.connection.collection('sessions');
  const legacyCount = await sessions.countDocuments({ googleMeetLink: { $exists: true } });

  if (process.argv.includes('--execute')) {
    const result = await sessions.updateMany(
      { googleMeetLink: { $exists: true } },
      { $unset: { googleMeetLink: '' } }
    );
    console.log(`Removed Google Meet URLs from ${result.modifiedCount} session(s).`);
  } else {
    console.log(`${legacyCount} session(s) still contain the retired Google Meet field.`);
    console.log('Preview only. Run with --execute to remove those URLs.');
  }

  await mongoose.disconnect();
}

removeGoogleMeetLinks().catch(async (error) => {
  console.error('Google Meet cleanup failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
