import axios from 'axios';
import Constants from 'expo-constants';

const fromExtra =
  (Constants.expoConfig?.extra as { API_BASE_URL?: string } | undefined)?.API_BASE_URL;

const baseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  fromExtra ||
  'http://localhost:5000';

// Exposed so screens that need full URLs (e.g. <Image source={{ uri }}> for /uploads
// static-served files) can construct them without re-reading config.
export const API_BASE_URL = baseURL;

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.info('[api] baseURL', baseURL);
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[api]', err?.response?.status, err?.config?.baseURL, err?.config?.url, err?.message);
    }
    return Promise.reject(err);
  }
);
