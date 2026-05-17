import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let configured = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function configureNotifications() {
  if (configured) return true;

  try {
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
