import axios from 'axios';
import { toast } from 'react-toastify';

// Dynamic backend URL from environment variables with fallback
// Try multiple sources to get the backend URL
const backendUrl = 
  // @ts-ignore - Vite environment variable
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || 
  process.env.VITE_BACKEND_URL || 
  process.env.REACT_APP_API_URL || 
  'http://localhost:5001';

console.log('Configuring axios with baseURL:', backendUrl);

// Set base URL - use environment variable with fallback
axios.defaults.baseURL = backendUrl;

// Enable withCredentials for all requests to allow cookies
axios.defaults.withCredentials = true;

// Simplified request interceptor that just adds the auth token
axios.interceptors.request.use(
  (config) => {
    try {
      console.log('Axios interceptor: Processing request to', config.url);
      const tokens = localStorage.getItem('tokens');
      if (tokens) {
        const parsedTokens = JSON.parse(tokens);
        if (parsedTokens.accessToken) {
          // Format: "Bearer [token]" with space between Bearer and token
          config.headers.Authorization = `Bearer ${parsedTokens.accessToken}`;
          console.log('Added auth token to request');
        } else {
          console.warn('No access token found in tokens object');
        }
      } else {
        console.log('No tokens found in localStorage');
      }
    } catch (error) {
      console.error('Error setting auth header:', error);
    }
    return config;
  },
  (error) => {
    console.error('Request error in axios interceptor:', error);
    return Promise.reject(error);
  }
);

// Simple response interceptor for basic error handling
axios.interceptors.response.use(
  (response) => {
    console.log('Axios response from', response.config.url, ':', response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    console.log('Error response:', error.response?.data, error.response?.status);
    
    if (error.response?.status === 401) {
      console.error('Unauthorized request - user may need to login again');
      // Consider handling token refresh or logout
    }
    
    if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error('An error occurred. Please try again.');
    }
    
    return Promise.reject(error);
  }
);

export default axios;
