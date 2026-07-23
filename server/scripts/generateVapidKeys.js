/**
 * One-time script to generate VAPID keys for Web Push Notifications.
 * Run:  node scripts/generateVapidKeys.js
 *
 * Copy the output values into your .env file.
 */
const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('\n══════════════════════════════════════════════════════');
console.log('  🔑  VAPID Keys Generated Successfully');
console.log('══════════════════════════════════════════════════════\n');
console.log('Add these to your server/.env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@skillsphere.com`);
console.log('\n══════════════════════════════════════════════════════');
console.log('  ⚠️  Keep the PRIVATE key secret! Never commit it.');
console.log('══════════════════════════════════════════════════════\n');
