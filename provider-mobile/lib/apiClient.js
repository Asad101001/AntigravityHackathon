import axios from 'axios';
import * as SecureStore from './secureStore';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const API_PORT = Number(process.env.EXPO_PUBLIC_API_PORT || 3001);

const trim = (v) => v?.replace(/\/+$/, '');

const getEnvBase = () => {
  const v = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
  return v ? trim(v) : null;
};

const getConstantsHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    Constants.manifest?.debuggerHost;

  if (!hostUri) return null;
  const ip = hostUri.split(':')[0];
  if (!ip || ip === 'localhost' || ip === '10.0.2.2' || ip === '127.0.0.1') return null;
  return `http://${ip}:${API_PORT}`;
};

const getScriptUrlHost = () => {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;
  const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
  const ip = match?.[1];
  if (!ip || ip === 'localhost' || ip === '10.0.2.2' || ip === '127.0.0.1') return null;
  return `http://${ip}:${API_PORT}`;
};

const getBrowserHost = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${API_PORT}`;
  }
  return null;
};

const getFallback = () => {
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`;
  return `http://localhost:${API_PORT}`;
};

const API_BASE =
  getEnvBase() ??
  getConstantsHost() ??
  getScriptUrlHost() ??
  getBrowserHost() ??
  getFallback();

const API_URL = API_BASE.endsWith('/api/') ? API_BASE : (API_BASE.endsWith('/api') ? `${API_BASE}/` : `${API_BASE}/api/`);

if (__DEV__) {
  console.log('[Config] Provider API_BASE resolved to:', API_BASE);
  console.log('[Config] Provider API_URL resolved to:', API_URL);
}

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  maxContentLength: 50 * 1024 * 1024,
  maxBodyLength: 50 * 1024 * 1024,
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Correct Axios behavior: strip leading slash from relative URLs so they don't override the baseURL subpath
      if (config.url && config.url.startsWith('/')) {
        config.url = config.url.substring(1);
      }
      
      const token = await SecureStore.getItemAsync('provider_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('SecureStore error in request interceptor:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('provider_token');
      } catch (err) {
        console.error('Error clearing token:', err);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
