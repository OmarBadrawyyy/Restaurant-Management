import { useCallback } from 'react';
import { useAuth as useAuthContext } from '../context/AuthContext';
import axios from 'axios';

// Enhance the auth hook with additional functionality
export function useAuth() {
  const auth = useAuthContext();
  
  // Add function to force refresh the user data
  const refreshUserData = useCallback(async () => {
    try {
      // Try to fetch user data from different endpoints
      const endpoints = ['/api/auth/me', '/api/users/profile'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
          });
          
          const userData = response.data.user || response.data.data || response.data;
          
          if (userData && (userData.username || userData.email)) {
            // If successful, update user data
            auth.updateUserData(userData);
            return userData;
          }
        } catch (error) {
          console.error(`Error fetching user data from ${endpoint}:`, error);
        }
      }
      
      throw new Error('Failed to fetch user data from any endpoint');
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return null;
    }
  }, [auth]);
  
  return {
    ...auth,
    refreshUserData
  };
}

export default useAuth; 