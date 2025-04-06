import axios from 'axios';

// Get CSRF token from cookies or request it from the server
const getCsrfToken = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN') {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Function to set CSRF token in cookies with the right settings
const setCsrfTokenInCookie = (token: string): void => {
  // Set the cookie with proper attributes
  document.cookie = `XSRF-TOKEN=${token}; path=/; samesite=strict; secure`;
  // Also store in local storage as backup
  localStorage.setItem('csrfToken', token);
  console.log('CSRF token set in cookie and localStorage');
};

// Function to fetch a fresh CSRF token
export const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    console.log('Fetching CSRF token from server');
    
    // Clear any existing CSRF token to ensure we get a fresh one
    document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('csrfToken');
    
    // Add small delay to ensure cookie is cleared
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Make the request with cache busting
    const response = await axios.get('/api/csrf-token', { 
      withCredentials: true,
      params: { 
        _t: Date.now(),
        forceRefresh: true 
      },
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      }
    });
    
    if (response.data?.csrfToken) {
      console.log('Successfully fetched CSRF token');
      
      // Set the cookie explicitly with proper attributes
      document.cookie = `XSRF-TOKEN=${response.data.csrfToken}; path=/; samesite=strict; secure`;
      
      // Also store in local storage as backup
      localStorage.setItem('csrfToken', response.data.csrfToken);
      
      console.log('CSRF token set in cookie and localStorage');
      return response.data.csrfToken;
    }
    
    console.error('No CSRF token in response:', response.data);
    return null;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
};

// Configure axios to handle CSRF token
axios.defaults.withCredentials = true;

// Ensure we have a CSRF token on page load
(async function initializeCsrfToken() {
  const existingToken = getCsrfToken();
  if (!existingToken) {
    console.log('No CSRF token found on init, fetching fresh token');
    await fetchCsrfToken();
  } else {
    console.log('CSRF token found in cookies on init');
  }
})();

// Add a request interceptor to add CSRF token to outgoing requests
axios.interceptors.request.use(
  async (config) => {
    // Only add CSRF token to these methods
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
      // First try to get token from cookies
      let token = getCsrfToken();
      
      // If no token in cookies, try from localStorage
      if (!token) {
        token = localStorage.getItem('csrfToken');
      }
      
      // If still no token, fetch a new one
      if (!token) {
        console.log('No CSRF token found, requesting from server');
        token = await fetchCsrfToken();
      }
      
      // Add token to request headers
      if (token) {
        config.headers['X-XSRF-TOKEN'] = token;
        console.log('Added CSRF token to request');
      } else {
        console.warn('Failed to get CSRF token for request');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to refresh token when it's expired
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // If error is CSRF related, try to refresh the token
    if (error.response && error.response.status === 403 && 
        error.response.data && error.response.data.message?.includes('CSRF')) {
      console.log('CSRF error detected, refreshing token');
      try {
        // Clear any existing tokens
        document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        localStorage.removeItem('csrfToken');
        
        // Fetch a fresh token
        const newToken = await fetchCsrfToken();
        
        // Retry the original request
        if (error.config && newToken) {
          console.log('Retrying original request with fresh CSRF token');
          // Ensure the new token is in the request
          error.config.headers['X-XSRF-TOKEN'] = newToken;
          return axios(error.config);
        }
      } catch (tokenError) {
        console.error('Failed to refresh CSRF token:', tokenError);
      }
    }
    return Promise.reject(error);
  }
);

export default axios; 