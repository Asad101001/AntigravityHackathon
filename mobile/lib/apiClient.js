import axios from 'axios';
import { API_URL } from '../config';
import { getAuthToken } from './authSession';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  maxContentLength: 50 * 1024 * 1024,
  maxBodyLength: 50 * 1024 * 1024,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Log request details for speech-to-text
  if (config.url?.includes('speech-to-text')) {
    const audioBase64Len = config.data?.audio_base64?.length || 0;
    const serializedLen = JSON.stringify(config.data).length;
    const bodyLen = typeof config.data === 'string' ? config.data.length : serializedLen;
    
    console.log(`[apiClient] Sending POST ${config.url}`);
    console.log(`[apiClient] - audio_base64 length: ${audioBase64Len}`);
    console.log(`[apiClient] - Serialized JSON length: ${serializedLen} bytes`);
    console.log(`[apiClient] - Final body length: ${bodyLen} bytes`);
    console.log(`[apiClient] - config.data type: ${typeof config.data}`);
    
    // Check if data got truncated
    if (config.data?.audio_base64 && config.data.audio_base64.length !== audioBase64Len) {
      console.warn(`[apiClient] WARNING: audio_base64 length mismatch!`);
    }
  }
  
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.config?.url?.includes('speech-to-text')) {
      console.log(`[apiClient] Response received, status: ${response.status}`);
    }
    return response;
  },
  (error) => {
    if (error.config?.url?.includes('speech-to-text')) {
      console.error(`[apiClient] Error:`, error.message, error.response?.status);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
