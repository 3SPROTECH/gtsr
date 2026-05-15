import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useAgencyFilterStore } from '../stores/agencyFilterStore';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({ baseURL, withCredentials: false });

// Routes filtrables par agence (uniquement pour ADMIN, en GET)
// L'agencyId est injecté automatiquement dans les query params.
const AGENCY_FILTERABLE = [
  /^\/tickets(\?|$)/,
  /^\/reports\/dashboard/,
  /^\/reports\/top-categories/,
  /^\/reports\/tech-workload/,
  /^\/admin\/users(\?|$)/,
];

api.interceptors.request.use((config) => {
  // Auth
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Filtre agence pour ADMIN sur les routes whitelistées
  const role = useAuthStore.getState().user?.role;
  const selectedAgencyId = useAgencyFilterStore.getState().selectedAgencyId;
  if (
    role === 'ADMIN' &&
    selectedAgencyId &&
    (config.method?.toLowerCase() === 'get' || !config.method) &&
    AGENCY_FILTERABLE.some((re) => re.test(config.url || ''))
  ) {
    config.params = { ...(config.params || {}), agencyId: selectedAgencyId };
  }

  return config;
});

let refreshing = false;
let queue = [];

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
      if (!refreshToken) { logout(); return Promise.reject(error); }

      if (refreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject, original }));
      }

      original._retry = true;
      refreshing = true;
      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        setAccessToken(data.accessToken);
        queue.forEach(({ resolve, original: o }) => {
          o._retry = true;
          o.headers.Authorization = `Bearer ${data.accessToken}`;
          resolve(api(o));
        });
        queue = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        queue.forEach(({ reject }) => reject(e));
        queue = [];
        logout();
        return Promise.reject(e);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
