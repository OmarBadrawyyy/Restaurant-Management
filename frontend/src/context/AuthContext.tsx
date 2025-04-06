import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import userService, { UserProfile } from '../services/userService';
import authUtils from '../utils/authUtils';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Types
interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  profileImage?: string;
  phoneNumber?: string;
}

interface AuthState {
  currentUser: User | null;
  csrfToken: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (registerData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: UserProfile) => Promise<UserProfile | null>;
  clearError: () => void;
  updateUserData: (userData: Partial<User>) => void;
  getAuthHeaders: () => Record<string, string>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Secure auth state management
const secureAuth = {
  getState: (): AuthState => {
    const stateString = sessionStorage.getItem('auth_state');
    if (!stateString) return { currentUser: null, csrfToken: null, isAuthenticated: false };
    try {
      const state = JSON.parse(stateString);
      if (state.csrfToken) {
        sessionStorage.setItem('csrf_token', state.csrfToken);
        axios.defaults.headers.common['X-CSRF-Token'] = state.csrfToken;
      }
      return state;
    } catch (err) {
      console.error('Failed to parse auth state', err);
      return { currentUser: null, csrfToken: null, isAuthenticated: false };
    }
  },
  
  setState: (state: AuthState): void => {
    sessionStorage.setItem('auth_state', JSON.stringify(state));
    if (state.csrfToken) {
      sessionStorage.setItem('csrf_token', state.csrfToken);
      axios.defaults.headers.common['X-CSRF-Token'] = state.csrfToken;
    } else {
      sessionStorage.removeItem('csrf_token');
      delete axios.defaults.headers.common['X-CSRF-Token'];
    }
  },
  
  clearState: (): void => {
    sessionStorage.removeItem('auth_state');
    sessionStorage.removeItem('csrf_token');
    delete axios.defaults.headers.common['X-CSRF-Token'];
  }
};

// Rate limiting for auth operations
let lastRefreshAttempt = 0;
let refreshFailureCount = 0;
const MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refresh attempts
const MAX_REFRESH_FAILURES = 3; // Maximum consecutive failures before forcing logout
let refreshingPromise: Promise<boolean> | null = null;

// Set up axios interceptors for handling auth errors and token refresh
const setupAxiosInterceptors = (refreshAuth: () => Promise<boolean>, logout: () => Promise<void>) => {
  // Response interceptor to handle auth errors
  axios.interceptors.response.use(
    response => response,
    async (error) => {
      const originalRequest = error.config;
      
      // Prevent infinite loops
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      // Check for auth-related errors
      const isAuthError = error.response?.status === 401;
      const isObjectIdError = 
        error.response?.data?.message?.includes('ObjectId') || 
        error.response?.data?.message?.includes('ID format') ||
        error.response?.data?.message?.includes('User lookup failed') ||
        error.response?.data?.message?.includes('Invalid session');
      
      // If we've reached max failures, just logout
      if (refreshFailureCount >= MAX_REFRESH_FAILURES) {
        console.error('Too many refresh failures, logging out');
        await logout();
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
      
      // Try to refresh for auth errors
      if (isAuthError && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const refreshSuccessful = await refreshAuth();
          if (refreshSuccessful) {
            // Retry the original request
            return axios(originalRequest);
          }
        } catch (refreshError) {
          console.error('Auth refresh failed:', refreshError);
          if (isObjectIdError || refreshFailureCount >= MAX_REFRESH_FAILURES) {
            await logout();
            return Promise.reject(new Error('Your session is invalid. Please log in again.'));
          }
        }
      }
      
      return Promise.reject(error);
    }
  );
};

// Auth refresh function - replace this with our improved version
const refreshAuth = async (): Promise<boolean> => {
  const now = Date.now();
  
  if ((now - lastRefreshAttempt) < MIN_REFRESH_INTERVAL) {
    return false;
  }
  
  if (refreshFailureCount >= MAX_REFRESH_FAILURES) {
    secureAuth.clearState();
    return false;
  }

  lastRefreshAttempt = now;
  
  if (refreshingPromise) {
    return refreshingPromise;
  }
  
  refreshingPromise = (async () => {
    try {
      // Use the new authUtils for token refresh
      const refreshResult = await authUtils.refreshTokens();
      
      // If refresh was successful, update the CSRF token in our secure auth state
      if (refreshResult) {
        const { csrfToken } = authUtils.getTokens();
        if (csrfToken) {
          const authState = secureAuth.getState();
          secureAuth.setState({
            ...authState,
            csrfToken
          });
        }
        
        refreshFailureCount = 0;
        return true;
      }
      
      refreshFailureCount++;
      return false;
    } catch (error) {
      console.error('Auth refresh failed:', error);
      refreshFailureCount++;
      return false;
    } finally {
      refreshingPromise = null;
    }
  })();
  
  return refreshingPromise;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const handleLogout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      try {
        await axios.post('/api/auth/logout', {}, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        console.error('Error during API logout', err);
      }
      
      secureAuth.clearState();
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
      navigate('/login');
    }
  };
  
  useEffect(() => {
    setupAxiosInterceptors(refreshAuth, handleLogout);
  }, []);
  
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        refreshFailureCount = 0;
        lastRefreshAttempt = 0;
        
        const authState = secureAuth.getState();
        
        if (authState.currentUser && authState.csrfToken) {
          try {
            const response = await axios.get('/api/auth/me');
            setCurrentUser(response.data.user);
          } catch (err) {
            console.error('Failed to get user info', err);
            secureAuth.clearState();
          }
        }
      } catch (err) {
        console.error('Auth initialization error', err);
        secureAuth.clearState();
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
  }, []);
  
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Attempting login with email:', email);
      const response = await axios.post('/api/auth/login', 
        { email, password },
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Login response:', response.data);
      
      if (response.status === 200 && response.data) {
        // Store tokens in localStorage for reuse
        if (response.data.accessToken) {
          localStorage.setItem('accessToken', response.data.accessToken);
          
          // Also store in tokens object for broader compatibility
          localStorage.setItem('tokens', JSON.stringify({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken || ''
          }));
          
          // Update axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
          console.log('Set authorization header with token from login');
        } else if (response.data.token) {
          // Handle alternative token format
          localStorage.setItem('accessToken', response.data.token);
          
          // Update axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          console.log('Set authorization header with token from login (alternative format)');
        }
        
        // Set CSRF token if available
        if (response.data.csrfToken) {
          axios.defaults.headers.common['X-CSRF-Token'] = response.data.csrfToken;
          console.log('Set CSRF token from login response');
        }
        
        // If user data doesn't have id but has _id, normalize it
        const userData = response.data.user;
        if (userData && !userData.id && userData._id) {
          userData.id = userData._id;
        }
        
        setCurrentUser(userData);
        secureAuth.setState({
          currentUser: userData,
          csrfToken: response.data.csrfToken || '',
          isAuthenticated: true
        });
        
        // Redirect based on user role
        if (userData.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (registerData: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.post('/api/auth/register', 
        registerData,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 201 && response.data) {
        setCurrentUser(response.data.user);
        secureAuth.setState({
          currentUser: response.data.user,
          csrfToken: response.data.csrfToken || '',
          isAuthenticated: true
        });
        
        navigate('/dashboard');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const clearError = () => {
    setError(null);
  };
  
  const updateProfile = async (profileData: UserProfile): Promise<UserProfile | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('AuthContext: Updating profile with data:', profileData);
      const updatedProfile = await userService.updateProfile(profileData);
      
      if (updatedProfile.status === 200 && updatedProfile.data) {
        console.log('AuthContext: Profile update API response:', updatedProfile);
        
        // Update user state with the updated profile data
        setCurrentUser(prevUser => {
          if (!prevUser) return null;
          
          const updatedUser = {
            ...prevUser,
            ...updatedProfile.data
          };
          
          // Update the auth state in secure storage
          const authState = secureAuth.getState();
          secureAuth.setState({
            ...authState,
            currentUser: updatedUser,
            isAuthenticated: true
          });
          
          console.log('AuthContext: Updated user state:', updatedUser);
          return updatedUser;
        });
        
        return profileData;
      } else {
        console.error('AuthContext: Profile update failed:', updatedProfile.error || 'Unknown error');
        throw new Error(updatedProfile.error || 'Failed to update profile');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Profile update failed';
      console.error('AuthContext: Profile update error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const value: AuthContextType = {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    error,
    login,
    register: handleRegister,
    logout: handleLogout,
    updateProfile,
    clearError,
    updateUserData: (userData: Partial<User>) => {
      if (currentUser) {
        const updatedUser = {...currentUser, ...userData};
        setCurrentUser(updatedUser);
        
        const authState = secureAuth.getState();
        secureAuth.setState({
          ...authState,
          currentUser: updatedUser
        });
      }
    },
    getAuthHeaders: () => {
      const authState = secureAuth.getState();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (authState.csrfToken) {
        headers['X-CSRF-Token'] = authState.csrfToken;
      }
      
      return headers;
    }
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;