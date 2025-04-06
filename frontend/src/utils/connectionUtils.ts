/**
 * Utilities for checking connection status with the backend server
 */
import toast from 'react-hot-toast';

// Define API_URL directly in this file to avoid import issues
const API_URL = process.env.REACT_APP_API_URL || '/api';

const CONNECTION_CHECK_TIMEOUT = 5000; // 5 seconds timeout

/**
 * Checks if the backend server is currently reachable
 * @returns Promise<boolean> True if server is reachable, false otherwise
 */
export const isServerReachable = async (): Promise<boolean> => {
  try {
    // Create an AbortController to implement timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_CHECK_TIMEOUT);
    
    console.log('Checking backend server connection...');
    
    // Use the /api/health endpoint or equivalent
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Server is considered reachable if we get any response
    const isReachable = response.ok;
    console.log(`Backend server is ${isReachable ? 'reachable' : 'not reachable'}`);
    
    return isReachable;
  } catch (error: any) {
    console.error('Error checking server connection:', error);
    
    // Check for specific error types
    if (error.name === 'AbortError') {
      console.log('Server connection check timed out');
    } else if (!navigator.onLine) {
      console.log('Browser is offline');
    }
    
    return false;
  }
};

/**
 * Shows an appropriate error message based on connection status
 */
export const showConnectionErrorMessage = async (): Promise<void> => {
  const isOnline = navigator.onLine;
  
  if (!isOnline) {
    toast.error('You are currently offline. Please check your internet connection.');
    return;
  }
  
  const isServerUp = await isServerReachable();
  
  if (!isServerUp) {
    toast.error('Cannot connect to the server. The server might be down or restarting.');
  } else {
    toast.error('Operation failed. Please try again later.');
  }
};

/**
 * Utility function to add connection status check to API calls
 * @param apiCall The API function to call
 * @param fallbackValue Optional fallback value to return if server is unreachable
 * @returns Result of the API call or fallback value
 */
export const withConnectionCheck = async <T>(
  apiCall: () => Promise<T>, 
  fallbackValue?: T
): Promise<T> => {
  try {
    // First check if server is reachable
    const isReachable = await isServerReachable();
    
    if (!isReachable) {
      showConnectionErrorMessage();
      
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      
      throw new Error('Server is not reachable');
    }
    
    // If server is reachable, proceed with the API call
    return await apiCall();
  } catch (error) {
    console.error('API call failed after connection check:', error);
    throw error;
  }
}; 