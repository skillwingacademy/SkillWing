const webPush = require('web-push');
const User = require('../models/User');

// ── Configure VAPID ──────────────────────────────────
// Graceful: if env vars are missing, log warning but don't crash
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@skillsphere.com';

let vapidConfigured = false;

try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  } else {
    console.warn('[WebPush] VAPID keys not configured. Push notifications disabled. Run: node scripts/generateVapidKeys.js');
  }
} catch (err) {
  console.error('[WebPush] Failed to configure VAPID:', err.message);
}

/**
 * Send a push notification to a specific user across all their subscribed devices.
 * Automatically removes stale/expired subscriptions.
 *
 * @param {string} userId   MongoDB user ID
 * @param {Object} payload  { title, body, icon, url }
 */
async function sendPushToUser(userId, payload) {
  if (!vapidConfigured) return;

  try {
    const user = await User.findById(userId).select('pushSubscriptions');
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return;
    }

    const payloadStr = JSON.stringify(payload);
    const staleEndpoints = [];

    for (const sub of user.pushSubscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime || null,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payloadStr
        );
      } catch (err) {
        const statusCode = err.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or unsubscribed — mark for removal
          staleEndpoints.push(sub.endpoint);
        } else {
          console.error(`[WebPush] Error sending to ${sub.endpoint.slice(0, 50)}...:`, err.message);
        }
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await User.updateOne(
        { _id: userId },
        { $pull: { pushSubscriptions: { endpoint: { $in: staleEndpoints } } } }
      );
      console.log(`[WebPush] Removed ${staleEndpoints.length} stale subscription(s) for user ${userId}`);
    }
  } catch (err) {
    console.error(`[WebPush] sendPushToUser error for user ${userId}:`, err.message);
  }
}

// ── Subscribe endpoint ──────────────────────────────
// @desc    Subscribe a device for push notifications
// @route   POST /api/notifications/subscribe
// @access  Private
const subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: 'Invalid push subscription object',
      });
    }

    const userId = req.user.id;

    // Prevent duplicates — check if this endpoint already exists
    const existing = await User.findOne({
      _id: userId,
      'pushSubscriptions.endpoint': subscription.endpoint,
    });

    if (!existing) {
      await User.updateOne(
        { _id: userId },
        {
          $addToSet: {
            pushSubscriptions: {
              endpoint: subscription.endpoint,
              expirationTime: subscription.expirationTime || null,
              keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
              },
            },
          },
        }
      );
    }

    res.status(200).json({ success: true, message: 'Push subscription saved' });
  } catch (err) {
    console.error('[WebPush] Subscribe error:', err.message);
    res.status(500).json({ success: false, message: 'Server error saving push subscription' });
  }
};

// ── Unsubscribe endpoint ──────────────────────────────
// @desc    Remove a device push subscription
// @route   DELETE /api/notifications/unsubscribe
// @access  Private
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required',
      });
    }

    await User.updateOne(
      { _id: req.user.id },
      { $pull: { pushSubscriptions: { endpoint } } }
    );

    res.status(200).json({ success: true, message: 'Push subscription removed' });
  } catch (err) {
    console.error('[WebPush] Unsubscribe error:', err.message);
    res.status(500).json({ success: false, message: 'Server error removing push subscription' });
  }
};

// ── Return VAPID public key to frontend ──────────────
// @desc    Get the VAPID public key for client-side subscription
// @route   GET /api/notifications/vapid-public-key
// @access  Private
const getVapidPublicKey = (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({
      success: false,
      message: 'Push notifications not configured on this server',
    });
  }

  res.status(200).json({
    success: true,
    data: { publicKey: VAPID_PUBLIC_KEY },
  });
};

module.exports = { subscribe, unsubscribe, getVapidPublicKey, sendPushToUser };
