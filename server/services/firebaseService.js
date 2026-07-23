const admin = require('firebase-admin');
const path = require('path');

let db = null;

try {
  // Use the same service account key as GCS
  const serviceAccountPath = process.env.GCS_KEY_FILE 
    ? path.resolve(process.env.GCS_KEY_FILE) 
    : path.resolve('./skillsphere.json');
    
  const serviceAccount = require(serviceAccountPath);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  db = admin.firestore();
  console.log('[FirebaseAdmin] ✓ Initialized successfully');
} catch (error) {
  console.error('[FirebaseAdmin] Failed to initialize Firebase Admin SDK:', error.message);
  console.warn('[FirebaseAdmin] Email notifications via Firestore will be disabled.');
}

module.exports = {
  db
};
