// Firebase Admin / Firestore is NOT used in this project:
//  - Email reminders use Brevo SMTP (utils/sendEmail.js)
//  - Push notifications use web-push (controllers/notificationController.js)
//  - Storage uses Google Cloud Storage (services/gcsService.js)
// Left as a stub so any legacy require() doesn't crash.

/*
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

let db = null;

try {
  const serviceAccountPath = process.env.GCS_KEY_FILE
    ? path.resolve(process.env.GCS_KEY_FILE)
    : path.resolve('./skillsphere.json');

  const serviceAccount = require(serviceAccountPath);

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }

  db = getFirestore();
  console.log('[FirebaseAdmin] ✓ Initialized successfully');
} catch (error) {
  console.error('[FirebaseAdmin] Failed to initialize Firebase Admin SDK:', error.message);
  console.warn('[FirebaseAdmin] Email notifications via Firestore will be disabled.');
}
*/

module.exports = {
  db: null
};
