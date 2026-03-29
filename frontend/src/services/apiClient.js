import axios from 'axios';
import toast from 'react-hot-toast';
import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor — attach Firebase auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const user = auth?.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Non-fatal — continue without auth header
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — surface errors as toasts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const msg =
      error.response?.data?.detail ||
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    if (status === 401) {
      toast.error('Session expired — please sign in again');
    } else if (status === 404) {
      toast.error('Resource not found');
    } else if (status === 422) {
      toast.error(`Validation error: ${msg}`);
    } else if (status === 429) {
      toast.error('Too many requests — please wait a moment');
    } else if (status >= 500) {
      toast.error('Server error — try again later');
    } else {
      toast.error(msg);
    }

    console.error('API Error:', status, msg);
    return Promise.reject(error);
  }
);

export default apiClient;
