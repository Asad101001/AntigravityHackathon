import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'asaaniyat_auth_token';
const USER_KEY = 'asaaniyat_auth_user';

let cachedToken = null;
let cachedUser = null;
let hydrated = false;

async function readWebStorage(key) {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(key);
}

async function writeWebStorage(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(key, value);
}

async function removeWebStorage(key) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(key);
}

export async function loadSession() {
  if (hydrated) return { token: cachedToken, user: cachedUser };

  if (Platform.OS === 'web') {
    cachedToken = (await readWebStorage(TOKEN_KEY)) || null;
    const rawUser = (await readWebStorage(USER_KEY)) || null;
    cachedUser = rawUser ? JSON.parse(rawUser) : null;
  } else {
    cachedToken = (await SecureStore.getItemAsync(TOKEN_KEY)) || null;
    const rawUser = (await SecureStore.getItemAsync(USER_KEY)) || null;
    cachedUser = rawUser ? JSON.parse(rawUser) : null;
  }

  hydrated = true;
  return { token: cachedToken, user: cachedUser };
}

export async function getSession() {
  if (!hydrated) return loadSession();
  return { token: cachedToken, user: cachedUser };
}

export async function getAuthToken() {
  const session = await getSession();
  return session.token;
}

export async function getAuthUser() {
  const session = await getSession();
  return session.user;
}

export async function setSession({ token, user }) {
  cachedToken = token || null;
  cachedUser = user || null;
  hydrated = true;

  if (Platform.OS === 'web') {
    if (token) await writeWebStorage(TOKEN_KEY, token);
    else await removeWebStorage(TOKEN_KEY);

    if (user) await writeWebStorage(USER_KEY, JSON.stringify(user));
    else await removeWebStorage(USER_KEY);
    return;
  }

  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);

  if (user) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  else await SecureStore.deleteItemAsync(USER_KEY);
}

export async function clearSession() {
  cachedToken = null;
  cachedUser = null;
  hydrated = true;

  if (Platform.OS === 'web') {
    await removeWebStorage(TOKEN_KEY);
    await removeWebStorage(USER_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
