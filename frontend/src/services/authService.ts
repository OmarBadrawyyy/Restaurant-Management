import axios from 'axios';
import authUtils from '../utils/authUtils';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Define API base URL
const API_URL = '/api/auth';

// Define data types for API requests and responses
export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  profileImage?: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  user: User;
  csrfToken: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Register a new user
 */
const register = async (userData: RegisterData): Promise<AuthResponse> => {
  try {
    console.log('Registering user:', userData.email);
    const response = await axios.post(`${API_URL}/register`, userData, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Registration response:', response.data);
    
    // Store tokens from response
    if (response.data && response.data.accessToken && response.data.refreshToken) {
      authUtils.storeTokens(
        response.data.accessToken,
        response.data.refreshToken,
        response.data.csrfToken
      );
    }
    
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Login a user
 */
const login = async (userData: LoginData): Promise<AuthResponse> => {
  try {
    console.log('Logging in user:', userData.email);
    const response = await axios.post(`${API_URL}/login`, userData, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login response:', response.data);
    
    // Store tokens from response
    if (response.data && response.data.accessToken && response.data.refreshToken) {
      authUtils.storeTokens(
        response.data.accessToken,
        response.data.refreshToken,
        response.data.csrfToken
      );
      
      // Also set the Authorization header for subsequent requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
      
      // Set CSRF token if available
      if (response.data.csrfToken) {
        axios.defaults.headers.common['X-CSRF-Token'] = response.data.csrfToken;
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Logout a user
 */
const logout = async (): Promise<void> => {
  try {
    console.log('Logging out user');
    await axios.post(`${API_URL}/logout`, {}, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear tokens regardless of server response
    authUtils.clearTokens();
    
    // Clear auth headers
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['X-CSRF-Token'];
  }
};

/**
 * Get current user data
 */
const getCurrentUser = async (): Promise<User | null> => {
  try {
    console.log('Fetching current user data');
    const response = await axios.get(`${API_URL}/me`, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Current user data:', response.data);
    return response.data.user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Request password reset
 */
const forgotPassword = async (email: string): Promise<{ message: string }> => {
  console.log('Requesting password reset for:', email);
  const response = await axios.post(`${API_URL}/forgot-password`, { email }, {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  console.log('Password reset request response:', response.data);
  return response.data;
};

/**
 * Reset password with token
 */
const resetPassword = async (token: string, newPassword: string): Promise<{ message: string }> => {
  console.log('Resetting password with token');
  const response = await axios.post(`${API_URL}/reset-password`, { token, newPassword }, {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  console.log('Password reset response:', response.data);
  return response.data;
};

/**
 * Change password (when logged in)
 */
const changePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  console.log('Changing password');
  const response = await axios.post(`${API_URL}/change-password`, { currentPassword, newPassword }, {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  console.log('Password change response:', response.data);
  return response.data;
};

// Export service functions
const authService = {
  register,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword
};

export default authService;