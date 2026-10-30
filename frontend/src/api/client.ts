import axios from 'axios';

export const AUTH_STORAGE_KEY = 'vitalis.auth';

// `||`, not `??` — an empty-string env value (e.g. a GitHub Actions
// variable that exists but was saved blank) must also fall through to the
// default, or axios silently treats API paths as relative to the current
// page instead of the backend.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
});

apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (raw) {
    const { accessToken } = JSON.parse(raw);
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
