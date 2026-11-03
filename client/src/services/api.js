import axios from 'axios';

export function resolveApiBase(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '/api';
  const withoutHealth = raw.endsWith('/api/health') ? raw.slice(0, -'/health'.length) : raw;
  if (withoutHealth.endsWith('/api')) return withoutHealth;
  return `${withoutHealth}/api`;
}

const baseURL = resolveApiBase(import.meta.env.VITE_API_URL);

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const url = String(error.config?.url || '');
    if (error.response?.status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);
