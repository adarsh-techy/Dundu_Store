import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

let logoutCallback = null;

export function setLogoutCallback(fn) {
  logoutCallback = fn;
}

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('velora_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // ignore storage errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => {
    const body = response.data;
    // Backend wraps all success responses as { success, message, data }
    // Auto-unwrap so screens receive the inner data directly
    return body && body.data !== undefined ? body.data : body;
  },
  async (error) => {
    const isAuthEndpoint =
      error.config &&
      (error.config.url.includes('/auth/login') ||
        error.config.url.includes('/auth/signup') ||
        error.config.url.includes('/auth/verify-otp') ||
        error.config.url.includes('/auth/forgot-password') ||
        error.config.url.includes('/auth/reset-password'));

    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      try {
        await AsyncStorage.removeItem('velora_token');
      } catch (e) {
        // ignore
      }
      if (logoutCallback) {
        logoutCallback();
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default client;
