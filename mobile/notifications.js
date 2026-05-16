import Constants from 'expo-constants';
import { Platform } from 'react-native';

let configured = false;
let notificationModule = null;

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

function loadNotifications() {
  if (isExpoGo()) return null;
  if (notificationModule) return notificationModule;

  try {
    // Lazy-load to avoid Expo Go Android's SDK 53+ remote-push warning path.
    // Local notifications remain active in development builds and APKs.
    // eslint-disable-next-line global-require
    notificationModule = require('expo-notifications');
    notificationModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return notificationModule;
  } catch (err) {
    console.warn('[Notifications] Module unavailable:', err.message);
    return null;
  }
}

export async function configureNotifications() {
  if (configured) return true;
  const Notifications = loadNotifications();
  if (!Notifications) return false;

  try {
    const current = await Notifications.getPermissionsAsync();
    const finalStatus = current.status === 'granted'
      ? current.status
      : (await Notifications.requestPermissionsAsync()).status;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('asaaniyat-service', {
        name: 'Asaaniyat Service Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0E8F46',
      });
    }

    configured = finalStatus === 'granted';
    return configured;
  } catch (err) {
    console.warn('[Notifications] Setup failed:', err.message);
    return false;
  }
}

export async function sendLocalNotification(title, body, data = {}) {
  const Notifications = loadNotifications();
  if (!Notifications) return false;

  try {
    const allowed = await configureNotifications();
    if (!allowed) return false;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn('[Notifications] Local notification failed:', err.message);
    return false;
  }
}
