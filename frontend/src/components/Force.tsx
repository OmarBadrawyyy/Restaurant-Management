import React from 'react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import axios from 'axios';

interface ForceProps {
  onSuccess?: () => void;
}

const Force: React.FC<ForceProps> = ({ onSuccess }) => {
  const { refreshUserData } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  // Direct token refresh function for emergency use
  const forceTokenRefresh = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        toast.error('No refresh token available');
        return false;
      }

      const response = await axios.post('/api/auth/refresh-token', 
        { refreshToken },
        {
          withCredentials: true,
          headers: { 
            'Content-Type': 'application/json',
            'X-Refresh-Token': refreshToken
          },
          timeout: 5000
        }
      );
      
      if (response.data && response.data.accessToken) {
        // Store with both keys for maximum compatibility
        localStorage.setItem('token', response.data.accessToken);
        localStorage.setItem('accessToken', response.data.accessToken);
        
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        if (response.data.csrfToken) {
          localStorage.setItem('csrfToken', response.data.csrfToken);
        }
        
        // Update default headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
        if (response.data.csrfToken) {
          axios.defaults.headers.common['X-CSRF-Token'] = response.data.csrfToken;
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Force token refresh failed:', error);
      return false;
    }
  };

  const handleForceRefresh = async () => {
    setIsLoading(true);
    try {
      // First try direct token refresh
      const tokenRefreshed = await forceTokenRefresh();
      
      if (tokenRefreshed) {
        // Then use the hook to refresh user data
        const result = await refreshUserData();
        if (result) {
          toast.success('User data refreshed successfully');
          if (onSuccess) {
            onSuccess();
          }
          return;
        }
      }
      
      // If we get here, the refresh failed
      toast.error('Failed to refresh user data. Try logging out and in again.');
    } catch (error) {
      console.error('Error forcing data refresh:', error);
      toast.error('Error refreshing data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleForceRefresh}
      disabled={isLoading}
      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors disabled:opacity-50"
    >
      {isLoading ? 'Refreshing...' : 'Force Refresh Data'}
    </button>
  );
};

export default Force; 