import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Enable sending cookies
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const response = await api.post('/api/auth/refresh-token');
        
        if (response.data.success) {
          // Update the stored token
          localStorage.setItem('token', response.data.accessToken);
          
          // Update the authorization header
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
          
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Add token expiration check
const checkTokenExpiration = () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      // If token expires in less than 5 minutes, refresh it
      if (expirationTime - currentTime < 5 * 60 * 1000) {
        api.post('/api/auth/refresh-token')
          .then(response => {
            if (response.data.success) {
              localStorage.setItem('token', response.data.accessToken);
            }
          })
          .catch(error => {
            console.error('Token refresh failed:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          });
      }
    } catch (error) {
      console.error('Error checking token expiration:', error);
    }
  }
};

// Check token expiration every minute
setInterval(checkTokenExpiration, 60 * 1000);

export default api; 