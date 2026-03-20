import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token or other headers here
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
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    if (status === 401) {
      toast.error('Session expired — please sign in again');
    } else if (status === 404) {
      toast.error('Resource not found');
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
