import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import api from '../api/axios';

/**
 * urlBase64ToUint8Array — converts a VAPID public key from base64 to Uint8Array
 * Required by the PushManager.subscribe() API.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * usePushNotifications — React hook for Web Push Notification lifecycle.
 *
 * On mount (when user is authenticated):
 *  1. Registers the Service Worker (/sw.js)
 *  2. Fetches VAPID public key from the backend
 *  3. Subscribes to push via the Push API
 *  4. Sends the subscription to the backend for storage
 *
 * Graceful: if browser doesn't support Push API or user denies
 * permission, logs a warning and does nothing.
 */
export function usePushNotifications() {
  const { user, token } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const hasSubscribed = useRef(false);

  useEffect(() => {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Browser does not support push notifications');
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
  }, []);

  useEffect(() => {
    // Only subscribe once per session when user is logged in
    if (!user || !token || !isSupported || hasSubscribed.current) return;
    hasSubscribed.current = true;

    subscribeToPush();
  }, [user, token, isSupported]);

  async function subscribeToPush() {
    try {
      // 1. Register the Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;

      // 2. Check if already subscribed
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        // Already subscribed — send to backend in case it's a new device/login
        await sendSubscriptionToServer(existingSub);
        setIsSubscribed(true);
        console.log('[Push] Already subscribed, synced with server');
        return;
      }

      // 3. Fetch VAPID public key from backend
      const { data: vapidResponse } = await api.get('/notifications/vapid-public-key');
      if (!vapidResponse.success || !vapidResponse.data?.publicKey) {
        console.warn('[Push] VAPID key not available from server');
        return;
      }

      const vapidPublicKey = urlBase64ToUint8Array(vapidResponse.data.publicKey);

      // 4. Subscribe via Push API (this triggers the browser permission prompt)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      // 5. Send subscription to backend
      await sendSubscriptionToServer(subscription);
      setIsSubscribed(true);
      console.log('[Push] Successfully subscribed to push notifications');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        console.log('[Push] User denied notification permission');
      } else {
        console.error('[Push] Subscription failed:', err.message);
      }
      setIsSubscribed(false);
    }
  }

  async function sendSubscriptionToServer(subscription) {
    try {
      await api.post('/notifications/subscribe', {
        subscription: subscription.toJSON(),
      });
    } catch (err) {
      console.error('[Push] Failed to send subscription to server:', err.message);
    }
  }

  async function unsubscribeFromPush() {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Remove from backend
      await api.delete('/notifications/unsubscribe', {
        data: { endpoint: subscription.endpoint },
      });

      setIsSubscribed(false);
      console.log('[Push] Unsubscribed from push notifications');
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err.message);
    }
  }

  return { isSupported, isSubscribed, subscribeToPush, unsubscribeFromPush };
}
