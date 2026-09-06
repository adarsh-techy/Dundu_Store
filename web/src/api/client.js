import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL || '';
const client = axios.create({ baseURL: apiBase ? `${apiBase}/api` : '/api' });


client.interceptors.request.use((config) => {
  const token = localStorage.getItem('dundu_token') || localStorage.getItem('velora_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      const isAuthEndpoint = err.config?.url?.includes('/auth/');
      if (!isAuthEndpoint) {
        localStorage.removeItem('dundu_token');
        localStorage.removeItem('velora_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err.response?.data || { message: err.message || 'Network error' });
  }
);

export default client;
