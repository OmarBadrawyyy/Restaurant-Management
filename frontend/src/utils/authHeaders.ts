/**
 * Authentication Headers Utility
 * Provides functions for managing authentication headers and checking user roles
 */
import Cookies from 'js-cookie';

// Type definitions for user roles
export type UserRole = 'admin' | 'manager' | 'staff' | 'user';

// User information interface
export interface UserInfo {
  _id: string;
  username: string;
  fullName?: string;
  email: string;
  role: UserRole;
}

/**
 * Gets the authentication token from cookies
 * @returns The authentication token or null if not found
 */
export const getAuthToken = (): string | null => {
  const token = Cookies.get('auth_token');
  return token || null;
};

/**
 * Gets authentication headers for API requests
 * @returns Object with Authorization header if token exists
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Adds authentication headers to an existing headers object
 * @param headers - Existing headers object
 * @returns Updated headers object with authentication
 */
export const addAuthToHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
  const token = getAuthToken();
  return token ? { ...headers, 'Authorization': `Bearer ${token}` } : headers;
};

/**
 * Checks if the user is currently authenticated
 * @returns Boolean indicating if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

/**
 * Gets the current user information from local storage
 * @returns User information object or null if not logged in
 */
export const getCurrentUser = (): UserInfo | null => {
  try {
    const userJson = localStorage.getItem('user_info');
    if (!userJson) return null;
    
    const user = JSON.parse(userJson) as UserInfo;
    return user;
  } catch (error) {
    console.error('Error parsing user information:', error);
    return null;
  }
};

/**
 * Gets the current user's role
 * @returns User's role or null if not logged in
 */
export const getUserRole = (): UserRole | null => {
  const user = getCurrentUser();
  return user ? user.role : null;
};

/**
 * Checks if the current user has admin role
 * @returns Boolean indicating if user is an admin
 */
export const isAdmin = (): boolean => {
  const role = getUserRole();
  return role === 'admin';
};

/**
 * Checks if the current user has manager role
 * @returns Boolean indicating if user is a manager
 */
export const isManager = (): boolean => {
  const role = getUserRole();
  return role === 'manager';
};

/**
 * Checks if the current user has manager or admin role
 * @returns Boolean indicating if user is a manager or admin
 */
export const isManagerOrAdmin = (): boolean => {
  const role = getUserRole();
  return role === 'manager' || role === 'admin';
};

/**
 * Checks if the current user has staff role
 * @returns Boolean indicating if user is a staff member
 */
export const isStaff = (): boolean => {
  const role = getUserRole();
  return role === 'staff';
};

/**
 * Checks if the current user has a specific role
 * @param role - The role to check
 * @returns Boolean indicating if user has the specified role
 */
export const hasRole = (role: UserRole): boolean => {
  const userRole = getUserRole();
  return userRole === role;
};

/**
 * Checks if the current user has at least one of the specified roles
 * @param roles - Array of roles to check
 * @returns Boolean indicating if user has any of the specified roles
 */
export const hasAnyRole = (roles: UserRole[]): boolean => {
  const userRole = getUserRole();
  return userRole ? roles.includes(userRole) : false;
};

/**
 * Saves user information to local storage
 * @param user - User information to save
 */
export const saveUserInfo = (user: UserInfo): void => {
  try {
    localStorage.setItem('user_info', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user information:', error);
  }
};

/**
 * Clears all authentication data from storage
 */
export const clearAuthData = (): void => {
  Cookies.remove('auth_token');
  localStorage.removeItem('user_info');
};

const authUtils = {
  getAuthToken,
  getAuthHeaders,
  addAuthToHeaders,
  isAuthenticated,
  getCurrentUser,
  getUserRole,
  isAdmin,
  isManager,
  isManagerOrAdmin,
  isStaff,
  hasRole,
  hasAnyRole,
  saveUserInfo,
  clearAuthData
};

export default authUtils; 