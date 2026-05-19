/**
 * notifications.js — Asaaniyat Notification System
 *
 * SDK 53 IMPORTANT: Android Push notifications were removed from Expo Go in SDK 53.
 * We detect Expo Go vs standalone APK and only run full setup in production builds.
 * Local notification scheduling still works in Expo Go (just without push channels).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Detect if running inside Expo Go (not a standalone APK/IPA)
function isExpoGo() {
  return (
    Constants.executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'expo'
  );
}

let _Notifications = null;
let _configured = false;
let _handlerSet = false;

async function _getModule() {
  if (Platform.OS === 'web') return null;
  if (_Notifications) return _Notifications;

  try {
    _Notifications = await import('expo-notifications');
    return _Notifications;
  } catch {
    return null;
  }
}

/**
 * Initialize the notification handler.
 * Must be called as early as possible (App.js) to ensure banners show.
 * Safe to call multiple times — idempotent.
 */
export async function initNotificationHandler() {
  if (_handlerSet) return;
  const N = await _getModule();
  if (!N) return;

  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  _handlerSet = true;
}

/**
 * Configure notification permissions and Android channel.
 * In Expo Go, we skip push-related setup entirely to avoid SDK 53 errors.
 */
export async function configureNotifications() {
  if (_configured) return true;
  if (Platform.OS === 'web') return false;

  const N = await _getModule();
  if (!N) return false;

  await initNotificationHandler();

  if (isExpoGo()) {
    // In Expo Go, skip channel/permissions — they cause SDK 53 error.
    // Local scheduling will still work within the session.
    _configured = true;
    return true;
  }

  // ── Standalone APK/IPA: full setup ──────────────────────────────────────────
  try {
    // Android: create notification channel with MAX importance for banner display
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('asaaniyat-service', {
        name: 'Asaaniyat Service Updates',
        description: 'Real-time updates for your service bookings',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0E8F46',
        sound: 'default',
        enableVibrate: true,
        showBadge: false,
        lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC,
      });
    }

    const { status: existingStatus } = await N.getPermissionsAsync();
    const finalStatus =
      existingStatus === 'granted'
        ? existingStatus
        : (await N.requestPermissionsAsync()).status;

    _configured = finalStatus === 'granted';
    return _configured;
  } catch (err) {
    // Non-fatal — notifications degrade gracefully
    console.warn('[Notifications] Setup failed (non-fatal):', err.message);
    _configured = true;
    return true;
  }
}

/**
 * Schedule an immediate local notification (banner).
 * Works in both Expo Go and standalone builds.
 * @param {string} title
 * @param {string} body
 * @param {object} data - extra payload
 */
export async function sendLocalNotification(title, body, data = {}) {
  const N = await _getModule();
  if (!N) return false;

  // Ensure handler is set before scheduling
  await initNotificationHandler();

  try {
    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        ...(Platform.OS === 'android' && !isExpoGo()
          ? { channelId: 'asaaniyat-service' }
          : {}),
      },
      trigger: null, // fire immediately
    });
    return true;
  } catch (err) {
    console.warn('[Notifications] Schedule failed (non-fatal):', err.message);
    return false;
  }
}
