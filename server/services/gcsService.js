/**
 * Google Cloud Storage Service
 *
 * Handles uploading and deleting avatar images in a GCS bucket.
 * Files are uploaded with public-read access so the returned URL
 * can be used directly in <img> tags without signed URLs.
 *
 * Uses lazy initialisation so env vars are read at call time
 * (after dotenv.config() has run in server.js).
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Lazy-initialised singleton
let _storage = null;

function getStorage() {
  if (!_storage) {
    _storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILE
        ? path.resolve(process.env.GCS_KEY_FILE)
        : undefined,
    });
  }
  return _storage;
}

function getBucketName() {
  const name = process.env.GCS_BUCKET_NAME;
  if (!name) {
    throw new Error(
      'GCS_BUCKET_NAME is not set. Check your .env file — the value must not contain quotes.'
    );
  }
  return name;
}

/**
 * Upload a file buffer to GCS and return its public URL.
 *
 * @param {Buffer}  fileBuffer — The file contents (from multer memoryStorage)
 * @param {String}  filename   — Desired object name in the bucket (e.g. "avatar-userId-timestamp.jpg")
 * @param {String}  mimeType   — MIME type of the file (e.g. "image/jpeg")
 * @returns {String} Public URL of the uploaded file
 */
async function uploadToGCS(fileBuffer, filename, mimeType) {
  const storage = getStorage();
  const bucketName = getBucketName();
  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(`avatars/${filename}`);

  await blob.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
  });

  // Public URL format for GCS
  return `https://storage.googleapis.com/${bucketName}/avatars/${filename}`;
}

/**
 * Delete a file from GCS given its full public URL.
 * Silently ignores errors (e.g. file already deleted or URL is not a GCS URL).
 *
 * @param {String} fileUrl — The full public URL of the file
 */
async function deleteFromGCS(fileUrl) {
  if (!fileUrl) return;

  let bucketName;
  try {
    bucketName = getBucketName();
  } catch {
    return; // GCS not configured, skip deletion
  }

  // Only attempt deletion if the URL points to our GCS bucket
  const prefix = `https://storage.googleapis.com/${bucketName}/`;
  if (!fileUrl.startsWith(prefix)) return;

  const objectName = fileUrl.replace(prefix, '');

  try {
    const storage = getStorage();
    await storage.bucket(bucketName).file(objectName).delete();
    console.log(`[GCS] Deleted: ${objectName}`);
  } catch (err) {
    // 404 = already deleted, don't throw
    if (err.code !== 404) {
      console.error(`[GCS] Delete error for ${objectName}:`, err.message);
    }
  }
}
/**
 * Upload a session attachment (homework, notes, etc.) to GCS.
 *
 * @param {Buffer}  fileBuffer — The file contents
 * @param {String}  filename   — Desired filename
 * @param {String}  mimeType   — MIME type
 * @param {String}  sessionId  — Session ID (used as folder prefix)
 * @returns {String} Public URL
 */
async function uploadSessionFile(fileBuffer, filename, mimeType, sessionId) {
  const storage = getStorage();
  const bucketName = getBucketName();
  const bucket = storage.bucket(bucketName);
  const objectName = `sessions/${sessionId}/${filename}`;
  const blob = bucket.file(objectName);

  await blob.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
      cacheControl: 'public, max-age=31536000',
    },
  });

  return `https://storage.googleapis.com/${bucketName}/${objectName}`;
}

/**
 * Upload a course thumbnail to GCS.
 *
 * @param {Buffer}  fileBuffer — The file contents
 * @param {String}  filename   — Desired filename
 * @param {String}  mimeType   — MIME type
 * @returns {String} Public URL
 */
async function uploadCourseThumbnail(fileBuffer, filename, mimeType) {
  const storage = getStorage();
  const bucketName = getBucketName();
  const bucket = storage.bucket(bucketName);
  const objectName = `courses/${filename}`;
  const blob = bucket.file(objectName);

  await blob.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
      cacheControl: 'public, max-age=31536000',
    },
  });

  return `https://storage.googleapis.com/${bucketName}/${objectName}`;
}

/**
 * Delete a session file from GCS given its full public URL.
 * Same pattern as deleteFromGCS but reusable for any path.
 *
 * @param {String} fileUrl — The full public URL
 */
async function deleteSessionFile(fileUrl) {
  // Reuse the generic delete logic
  return deleteFromGCS(fileUrl);
}
/**
 * Generate a signed URL for temporary access to a private GCS object.
 * 
 * @param {String} fileUrl — The original GCS public URL stored in DB
 * @returns {String} Signed URL (valid for 1 hour) or original URL on failure
 */
async function generateSignedUrl(fileUrl) {
  if (!fileUrl) return null;
  
  let bucketName;
  try {
    bucketName = getBucketName();
  } catch {
    return fileUrl;
  }

  const prefix = `https://storage.googleapis.com/${bucketName}/`;
  if (!fileUrl.startsWith(prefix)) return fileUrl;

  const objectName = fileUrl.replace(prefix, '');
  const storage = getStorage();
  
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  };

  try {
    const [url] = await storage.bucket(bucketName).file(objectName).getSignedUrl(options);
    return url;
  } catch (err) {
    console.error(`[GCS] Signed URL error for ${objectName}:`, err.message);
    return fileUrl; // fallback
  }
}

module.exports = { uploadToGCS, deleteFromGCS, uploadSessionFile, deleteSessionFile, generateSignedUrl, uploadCourseThumbnail };
