import Constants from 'expo-constants';
import { Platform } from 'react-native';

let configured = false;
let NotificationsModule = null;
let handlerConfigured = false;

function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
}

async function getNotificationsModule() {
  if (Platform.OS === 'web') return null;
  if (NotificationsModule) return NotificationsModule;

  NotificationsModule = await import('expo-notifications');

  if (!handlerConfigured) {
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }

  return NotificationsModule;
}

export async function configureNotifications() {
  if (configured) return true;

  if (Platform.OS === 'web') {
    configured = false;
    return false;
  }

  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      configured = false;
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('asaaniyat-service', {
        name: 'Asaaniyat Service Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0E8F46',
        sound: 'default',
      });
    }

    const current = await Notifications.getPermissionsAsync();
    const finalStatus = current.status === 'granted'
      ? current.status
      : (await Notifications.requestPermissionsAsync()).status;

    configured = finalStatus === 'granted';
    return configured;
  } catch (err) {
    console.warn('[Notifications] Setup failed:', err.message);
    return false;
  }
}

export async function sendLocalNotification(title, body, data = {}) {
  try {
    const allowed = await configureNotifications();
    if (!allowed) return false;

    const Notifications = await getNotificationsModule();
    if (!Notifications) return false;

    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default' },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn('[Notifications] Local notification failed:', err.message);
    return false;
  }
}
