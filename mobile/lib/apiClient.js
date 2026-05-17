import axios from 'axios';
import { API_URL } from '../config';
import { getAuthToken } from './authSession';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
