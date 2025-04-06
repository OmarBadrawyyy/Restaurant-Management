import axios from 'axios';
import localStorageService from '../services/localStorage';

/**
 * AuthUtils - Standardized utilities for authentication token management
 * This helps prevent issues with missing refresh tokens and standardizes token handling
 */

// Constants
const AUTH_ENDPOINTS = {
  REFRESH: '/api/auth/refresh-token',
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REGISTER: '/api/auth/register',
  ME: '/api/auth/me'
};

// Token storage keys
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  CSRF_TOKEN: 'csrfToken'
};

// Cookie utility functions
const getCookie = (name: string): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
};

const setCookie = (name: string, value: string, days = 7): void => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expirationDate.toUTCString()};path=/;SameSite=Lax`;
};

const removeCookie = (name: string): void => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
};

/**
 * Multi-layer token storage to prevent token loss
 */
const authStorage = {
  // Store tokens in both localStorage and cookies for redundancy
  storeTokens: (accessToken: string, refreshToken: string, csrfToken?: string): void => {
    try {
      // Store in localStorage
      localStorageService.setTokens(accessToken, refreshToken);
      
      // Store in cookies as backup
      setCookie(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
      setCookie(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
      
      if (csrfToken) {
        localStorage.setItem(TOKEN_KEYS.CSRF_TOKEN, csrfToken);
        setCookie(TOKEN_KEYS.CSRF_TOKEN, csrfToken);
      }
      
      // Also update axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      if (csrfToken) {
        axios.defaults.headers.common['X-CSRF-Token'] = csrfToken;
      }
      
      console.log('Tokens stored successfully');
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  },
  
  // Get tokens with fallback to cookies if localStorage fails
  getTokens: () => {
    try {
      // Try localStorage first
      let accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
      let refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
      let csrfToken = localStorage.getItem(TOKEN_KEYS.CSRF_TOKEN);
      
      // If tokens not in localStorage, try cookies as fallback
      if (!accessToken) accessToken = getCookie(TOKEN_KEYS.ACCESS_TOKEN);
      if (!refreshToken) refreshToken = getCookie(TOKEN_KEYS.REFRESH_TOKEN);
      if (!csrfToken) csrfToken = getCookie(TOKEN_KEYS.CSRF_TOKEN);
      
      return { accessToken, refreshToken, csrfToken };
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return { accessToken: null, refreshToken: null, csrfToken: null };
    }
  },
  
  // Remove tokens from all storage locations
  clearTokens: (): void => {
    try {
      // Clear from localStorage
      localStorageService.removeTokens();
      localStorage.removeItem(TOKEN_KEYS.CSRF_TOKEN);
      
      // Clear from cookies
      removeCookie(TOKEN_KEYS.ACCESS_TOKEN);
      removeCookie(TOKEN_KEYS.REFRESH_TOKEN);
      removeCookie(TOKEN_KEYS.CSRF_TOKEN);
      
      // Clear from axios headers
      delete axios.defaults.headers.common['Authorization'];
      delete axios.defaults.headers.common['X-CSRF-Token'];
      
      console.log('Tokens cleared successfully');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }
};

/**
 * Token refresh functionality
 */
let refreshAttemptInProgress: Promise<boolean> | null = null;

const refreshAuthTokens = async (): Promise<boolean> => {
  if (refreshAttemptInProgress) {
    return refreshAttemptInProgress;
  }
  
  refreshAttemptInProgress = (async () => {
    try {
      console.log('Starting token refresh process');
      
      // Get the refresh token
      const { refreshToken } = authStorage.getTokens();
      
      if (!refreshToken) {
        console.error('Refresh token not found in storage');
        return false;
      }
      
      // Send refresh request with the token in multiple ways to ensure it's received
      // - In request body
      // - In cookies (already set if using our storage system)
      // - In custom header as fallback
      const response = await axios.post(
        AUTH_ENDPOINTS.REFRESH, 
        { refreshToken }, // Include in body explicitly 
        {
          withCredentials: true, // Send cookies
          headers: {
            'Content-Type': 'application/json',
            'X-Refresh-Token': refreshToken // Backup in header
          }
        }
      );
      
      if (response.data && response.data.accessToken) {
        // Store the new tokens
        authStorage.storeTokens(
          response.data.accessToken,
          response.data.refreshToken || refreshToken, // Use new refresh token if provided, otherwise keep the current one
          response.data.csrfToken
        );
        
        console.log('Token refresh successful');
        return true;
      } else {
        console.error('Token refresh response missing tokens');
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    } finally {
      refreshAttemptInProgress = null;
    }
  })();
  
  return refreshAttemptInProgress;
};

/**
 * Setup axios interceptors for automatic token handling
 */
const setupAuthInterceptors = () => {
  // Request interceptor to add token to all requests
  axios.interceptors.request.use(
    config => {
      const { accessToken, csrfToken } = authStorage.getTokens();
      
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
      
      return config;
    },
    error => Promise.reject(error)
  );
  
  // Response interceptor to handle 401 errors
  axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;
      
      // Don't retry if already retried or if the request is to the refresh endpoint
      if (
        originalRequest._retry || 
        originalRequest.url === AUTH_ENDPOINTS.REFRESH ||
        error.response?.status !== 401
      ) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshSuccess = await refreshAuthTokens();
        
        if (refreshSuccess) {
          // Update the Authorization header with the new token
          const { accessToken } = authStorage.getTokens();
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          
          // Retry the original request
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Error during token refresh:', refreshError);
      }
      
      // If refresh failed, clear tokens and reject
      authStorage.clearTokens();
      return Promise.reject(error);
    }
  );
};

// Initialize auth - call this when your app starts
const initializeAuth = () => {
  console.log('Initializing authentication utilities');
  
  // Set up interceptors
  setupAuthInterceptors();
  
  // Check and set tokens in axios headers
  const { accessToken, csrfToken } = authStorage.getTokens();
  if (accessToken) {
    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  }
  if (csrfToken) {
    axios.defaults.headers.common['X-CSRF-Token'] = csrfToken;
  }
};

// Export the auth utilities
const authUtils = {
  storeTokens: authStorage.storeTokens,
  getTokens: authStorage.getTokens,
  clearTokens: authStorage.clearTokens,
  refreshTokens: refreshAuthTokens,
  initialize: initializeAuth,
  AUTH_ENDPOINTS
};

export default authUtils; 