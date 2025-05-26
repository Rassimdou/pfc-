import axios from 'axios';

// Get the API URL from environment variables or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Ensure API_URL doesn't end with a slash
const cleanApiUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

console.log('Initializing axios with API URL:', cleanApiUrl);

const api = axios.create({
  baseURL: `${cleanApiUrl}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true,
  timeout: 15000, // Increased timeout to 15 seconds
  retry: 3, // Number of retries
  retryDelay: 1000 // Delay between retries in milliseconds
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
      
      // Check if we should retry
      const config = error.config;
      if (config && config.retry > 0) {
        config.retry -= 1;
        console.log(`Retrying request (${config.retry} attempts remaining)...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        
        // Retry the request
        return api(config);
      }
      
      // If we're out of retries, try to ping the server
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

export default api; 