import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ─── In-memory access token storage ───────────────────────────────────────
// Stored in memory (not localStorage) — safer against XSS attacks
let _accessToken: string | null = null;

export const setAccessToken = (token: string) => { _accessToken = token; };
export const getAccessToken = (): string | null => _accessToken;
export const clearAccessToken = () => { _accessToken = null; };

// ─── Public client ─────────────────────────────────────────────────────────
// Used for: login, register, refresh — no auth header needed
export const publicApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send/receive httpOnly cookies
});

// ─── Private client ────────────────────────────────────────────────────────
// Used for all protected API calls — auto attaches + refreshes token
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auto-refresh logic ────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh on 401 and only once per request
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Queue subsequent requests while refresh is in progress
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Call refresh endpoint — sends httpOnly cookie automatically
      const res = await publicApi.post('/auth/refresh');
      const newToken: string = res.data.accessToken;

      setAccessToken(newToken);
      processQueue(null, newToken);

      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAccessToken();
      // Redirect to login if refresh also fails
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;