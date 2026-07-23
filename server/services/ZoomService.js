const axios = require('axios');

/**
 * ZoomService — Isolated service for Zoom Server-to-Server OAuth integration.
 * Uses account-level credentials to generate meetings without per-user OAuth.
 */

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Fetches (or returns cached) OAuth access token from Zoom S2S OAuth.
 * Uses Basic Authentication with ZOOM_CLIENT_ID:ZOOM_CLIENT_SECRET.
 */
async function getAccessToken() {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const { ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_ACCOUNT_ID } = process.env;

  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
    throw new Error('Zoom credentials not configured. Set ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and ZOOM_ACCOUNT_ID in .env');
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    null,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  cachedToken = response.data.access_token;
  // Zoom tokens typically expire in 3600s; cache accordingly
  tokenExpiresAt = Date.now() + (response.data.expires_in || 3600) * 1000;

  return cachedToken;
}

/**
 * Creates a scheduled Zoom meeting.
 * @param {string} topic   - Meeting topic / session title
 * @param {string|Date} startTime - ISO 8601 start time
 * @param {number} duration - Duration in minutes (default 60)
 * @returns {{ joinUrl: string, startUrl: string, meetingId: number, password: string }}
 */
async function createMeeting(topic, startTime, duration = 60) {
  const token = await getAccessToken();

  const payload = {
    topic,
    type: 2, // Scheduled meeting
    start_time: new Date(startTime).toISOString(),
    duration,
    timezone: 'Asia/Kolkata',
    settings: {
      join_before_host: true,
      waiting_room: false,
      auto_recording: 'none',
      mute_upon_entry: true,
      approval_type: 2, // No registration required
    },
  };

  const response = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    joinUrl: response.data.join_url,
    startUrl: response.data.start_url,
    meetingId: response.data.id,
    password: response.data.password || '',
  };
}

module.exports = { getAccessToken, createMeeting };
