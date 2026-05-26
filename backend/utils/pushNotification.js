const admin = require('firebase-admin');
const db = require('../db');

let fcmInitialized = false;

try {
  // Initialize the Firebase Admin SDK
  if (admin.apps.length === 0) {
    // If GOOGLE_APPLICATION_CREDENTIALS env is set (local dev), admin.initializeApp() picks it up automatically.
    // In Cloud Run, it automatically picks up the service account's default credentials.
    admin.initializeApp();
  }
  fcmInitialized = true;
  console.log('✅ Firebase Admin SDK successfully initialized for Push Notifications.');
} catch (error) {
  console.warn(
    '⚠️ Failed to initialize Firebase Admin SDK. Push notifications will fall back to mock logging.\n' +
    'Reason:', error.message
  );
}

/**
 * Sends a push notification to a specific user via their registered FCM token.
 * 
 * @param {string} userId - The ID of the recipient user
 * @param {string} title - The title of the push notification
 * @param {string} body - The message body of the notification
 * @param {Object} data - Additional metadata payload (must be string-key, string-value pairs)
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const user = await db.findUserById(userId);
    if (!user) {
      console.warn(`[PushNotification] User ${userId} not found.`);
      return false;
    }

    const pushToken = user.pushToken;
    if (!pushToken) {
      console.log(`[PushNotification] Skipped: User ${userId} has no registered push token.`);
      return false;
    }

    if (!fcmInitialized) {
      console.log(`[PushNotification Mock] to User ${userId} (${user.displayName}): "${title}" - "${body}"`);
      return true;
    }

    // Format all data values to strings (FCM requirement for data payload)
    const formattedData = {};
    for (const [key, value] of Object.entries(data)) {
      formattedData[key] = String(value);
    }

    const message = {
      notification: { title, body },
      data: formattedData,
      token: pushToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'asaaniyat-service',
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log(`🚀 [PushNotification] Successfully sent to User ${userId}:`, response);
    return true;
  } catch (error) {
    console.error(`❌ [PushNotification] Failed to send to User ${userId}:`, error.message);
    return false;
  }
}

module.exports = {
  sendPushNotification,
  fcmInitialized,
};
