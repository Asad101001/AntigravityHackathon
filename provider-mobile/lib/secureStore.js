import * as ExpoSecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function getItemAsync(key) {
  if (isWeb) {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  }
  return ExpoSecureStore.getItemAsync(key);
}

export async function setItemAsync(key, value) {
  if (isWeb) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
    return;
  }
  return ExpoSecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key) {
  if (isWeb) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
    return;
  }
  return ExpoSecureStore.deleteItemAsync(key);
}
