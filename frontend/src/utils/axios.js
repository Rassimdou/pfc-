import axios from 'axios';

// Get the API URL from environment variables or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

console.log('Initializing axios with API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true,
  timeout: 10000 // 10 seconds timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log('Making request to:', {
      url: fullUrl,
      method: config.method,
      headers: config.headers
    });
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    const errorDetails = {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message,
      code: error.code,
      fullUrl: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown'
    };
    
    console.error('Response error:', errorDetails);
    
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - unable to reach the server at:', errorDetails.fullUrl);
      // Try to ping the server
      try {
        const response = await fetch(`${API_URL}/test`);
        const data = await response.json();
        console.log('Server test response:', data);
      } catch (pingError) {
        console.error('Server ping failed:', pingError);
      }
    }
    
    if (error.response?.status === 401) {
      console.log('Unauthorized, clearing storage and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Add retry logic for failed requests
api.interceptors.response.use(null, async (error) => {
  const { config } = error;
  if (!config || !config.retry) {
    return Promise.reject(error);
  }
  
  config.retry -= 1;
  const delayRetry = new Promise(resolve => {
    setTimeout(resolve, config.retryDelay || 1000);
  });
  
  await delayRetry;
  return api(config);
});

export default api; 