import axios from 'axios';

const API_URL = '/api/users';
const ADMIN_API_URL = '/api/admin';

// Define data types
export interface User {
  id?: string;
  _id?: string; // MongoDB ID
  username: string;
  email: string;
  role: string;
  profileImage?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
  status?: string;
  isActive?: boolean;
  lastLogin?: string;
}

export interface UserProfile {
  username?: string;
  phoneNumber?: string;
  email?: string;
  profileImage?: string;
  currentPassword?: string;
  newPassword?: string;
}

// Response type for standardized API responses
export interface ApiResponse<T = any> {
  status: number;
  data?: T;
  message?: string;
  error?: string;
}

// Helper function to get current CSRF token
const getCsrfToken = (): string => {
  // Try to get it from axios headers first
  const axiosToken = axios.defaults.headers.common['X-CSRF-Token'];
  if (axiosToken) return axiosToken as string;
  
  // Fall back to sessionStorage
  return sessionStorage.getItem('csrf_token') || '';
};

// Helper function to refresh CSRF token
export const refreshCsrfToken = async (): Promise<void> => {
  try {
    const response = await axios.get('/api/csrf-token');
    const token = response.data.csrfToken;
    if (token) {
      // Store token in axios defaults for future requests
      axios.defaults.headers.common['X-CSRF-Token'] = token;
    }
  } catch (error) {
    console.error('Error refreshing CSRF token:', error);
  }
};

// Get current user profile
const getProfile = async (): Promise<ApiResponse<User>> => {
  try {
    const response = await axios.get(`${API_URL}/profile`);
    return { status: response.status, data: response.data.user };
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return { status: error?.response?.status || 500, error: error?.message || 'Unknown error' };
  }
};

// Update user profile
const updateProfile = async (profileData: UserProfile): Promise<ApiResponse<User>> => {
  try {
    console.log('userService: Updating profile with data:', profileData);
    
    // Ensure CSRF token is available
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
      console.log('userService: CSRF token not found, refreshing...');
      await refreshCsrfToken();
    }
    
    // Use the auth API endpoint for profile updates
    const response = await axios.put('/api/auth/profile', profileData, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': getCsrfToken(),
        'Content-Type': 'application/json'
      }
    });
    
    console.log('userService: Profile update success response:', response.data);
    return { 
      status: response.status, 
      data: response.data.user, 
      message: response.data.message 
    };
  } catch (error: any) {
    console.error('userService: Error updating profile:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    return { 
      status: error?.response?.status || 500, 
      error: errorMessage 
    };
  }
};

// Change password
const changePassword = async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
  try {
    console.log('userService: Changing password');
    
    // Ensure CSRF token is available and refresh if needed
    let csrfToken = getCsrfToken();
    if (!csrfToken) {
      console.log('userService: CSRF token not found, refreshing...');
      await refreshCsrfToken();
      csrfToken = getCsrfToken();
    }
    
    // Add detailed logging
    console.log('userService: Making password change request with CSRF token');
    
    // Use the auth API endpoint for password change
    const response = await axios.post('/api/auth/change-password', 
      { 
        currentPassword, 
        newPassword 
      },
      {
        withCredentials: true,
        headers: {
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('userService: Password change response:', response.data);
    
    return { 
      status: response.status, 
      message: response.data.message || 'Password changed successfully' 
    };
  } catch (error: any) {
    console.error('userService: Error changing password:', error);
    console.error('userService: Error details:', error.response?.data);
    
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    return { 
      status: error?.response?.status || 500, 
      error: errorMessage 
    };
  }
};

// Get all users (admin only)
const getAllUsers = async (): Promise<ApiResponse<User[]>> => {
  try {
    const response = await axios.get(`${API_URL}/all`);
    return { status: response.status, data: response.data.users };
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return { status: error?.response?.status || 500, error: error?.message || 'Unknown error' };
  }
};

// Get all users (admin endpoint)
const getAdminUsers = async (): Promise<ApiResponse<User[]>> => {
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    
    const response = await axios.get(`${ADMIN_API_URL}/users`, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      },
      timeout: 3000 // Add 3 second timeout to prevent long waits
    });
    
    // If we get data back, filter out any admin users - managers shouldn't see them
    const users = response.data.users || [];
    const filteredUsers = users.filter((user: User) => user.role !== 'admin');
    
    return { 
      status: response.status, 
      data: filteredUsers,
      message: response.data.message
    };
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return { status: error?.response?.status || 500, error: error?.message || 'Unknown error' };
  }
};

// Get user by ID (admin only)
const getUserById = async (id: string): Promise<ApiResponse<User>> => {
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    
    const response = await axios.get(`${ADMIN_API_URL}/users/${id}`, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      }
    });
    
    return { 
      status: response.status, 
      data: response.data.user 
    };
  } catch (error: any) {
    // If we get a 404, that's actually good - it means the user was deleted
    if (error?.response?.status === 404) {
      return { status: 404, message: 'User not found - deletion confirmed' };
    }
    console.error(`Error fetching user ${id}:`, error);
    return { status: error?.response?.status || 500, error: error?.message || 'Unknown error' };
  }
};

// Update user by ID (admin only)
const updateUser = async (id: string, userData: Partial<User>): Promise<ApiResponse<User>> => {
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    
    const response = await axios.put(`${ADMIN_API_URL}/users/${id}`, userData, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      }
    });
    
    return { 
      status: response.status, 
      data: response.data.user,
      message: response.data.message 
    };
  } catch (error: any) {
    console.error(`Error updating user ${id}:`, error);
    return { status: error?.response?.status || 500, error: error?.message || 'Unknown error' };
  }
};

// Delete user (admin only) with retry logic
const deleteUser = async (id: string): Promise<ApiResponse> => {
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    
    console.log(`Attempting to delete user: ${id}`);
    
    // Attempt the user deletion
    const response = await axios.delete(`${ADMIN_API_URL}/users/${id}`, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      }
    });
    
    console.log('User deletion API response:', response.data);
    
    return { 
      status: response.status, 
      message: response.data.message 
    };
  } catch (error: any) {
    console.error(`Error deleting user ${id}:`, error);
    return { status: error?.response?.status || 500, error: error?.message || 'Unknown error' };
  }
};

// Create new user (admin only)
const createUser = async (userData: Partial<User>): Promise<ApiResponse<User>> => {
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    
    const response = await axios.post(`${ADMIN_API_URL}/users`, userData, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      }
    });
    
    return { 
      status: response.status, 
      data: response.data.user,
      message: response.data.message 
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { status: error?.response?.status || 500, error: error?.message || 'Unknown error' };
  }
};

// Reset user password (admin only)
const resetUserPassword = async (id: string, newPassword?: string): Promise<ApiResponse> => {
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    
    const requestData = newPassword ? { newPassword } : {};
    
    const response = await axios.post(`${ADMIN_API_URL}/users/${id}/reset-password`, requestData, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      }
    });
    
    return { 
      status: response.status, 
      message: response.data.message 
    };
  } catch (error: any) {
    console.error(`Error resetting password for user ${id}:`, error);
    return { status: error?.response?.status || 500, error: error?.message || 'Unknown error' };
  }
};

// MANAGER STAFF FUNCTIONS USING ACTUAL BACKEND ENDPOINTS
// ===========================================

// Get staff managed by current manager
const getManagerStaff = async (): Promise<ApiResponse<User[]>> => {
  console.log(`getManagerStaff: Starting staff data fetch`);
  
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    console.log('getManagerStaff: CSRF token retrieved:', csrfToken ? 'Token available' : 'No token');
    
    console.log(`getManagerStaff: Making API request to ${ADMIN_API_URL}/users/staff`);
    
    const response = await axios.get(`${ADMIN_API_URL}/users/staff`, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Accept': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });
    
    console.log('getManagerStaff: Received response:', response.status);
    
    if (!response.data || !Array.isArray(response.data)) {
      console.error('getManagerStaff: Unexpected response format:', response.data);
      return { 
        status: 500, 
        error: 'Unexpected response format from server' 
      };
    }
    
    return { 
      status: response.status, 
      data: response.data 
    };
  } catch (error: any) {
    console.error(`getManagerStaff: Error fetching staff:`, error);
    console.error('getManagerStaff: Error details:', error.response?.data);
    
    return { 
      status: error?.response?.status || 500, 
      error: error?.response?.data?.message || error?.message || 'Failed to fetch staff data'
    };
  }
};

// Create a new staff member using admin API
// If permission issues occur, this will return appropriate error
const createStaffMember = async (userData: Partial<User>): Promise<ApiResponse<User>> => {
  console.log(`createStaffMember: Starting staff creation with data:`, userData);
  
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    console.log('createStaffMember: CSRF token retrieved:', csrfToken ? 'Token available' : 'No token');
    
    // Ensure role is set to 'staff' as managers can only create staff
    const staffData = {
      ...userData,
      role: 'staff'
    };
    
    console.log(`createStaffMember: Making API request to ${ADMIN_API_URL}/users`);
    
    // Attempt to use admin endpoint (might fail if manager doesn't have permission)
    const response = await axios.post(`${ADMIN_API_URL}/users`, staffData, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });
    
    console.log('createStaffMember: Received response:', response.status);
    
    return { 
      status: response.status, 
      data: response.data 
    };
  } catch (error: any) {
    console.error(`createStaffMember: Error creating staff member:`, error);
    console.error('createStaffMember: Error details:', error.response?.data);
    
    return { 
      status: error?.response?.status || 500, 
      error: error?.response?.data?.message || error?.message || 'Failed to create staff member'
    };
  }
};

// Update a staff member using admin API
// If permission issues occur, this will return appropriate error
const updateStaffMember = async (id: string, userData: Partial<User>): Promise<ApiResponse<User>> => {
  console.log(`updateStaffMember: Starting update for staff ID ${id} with data:`, userData);
  
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    console.log('updateStaffMember: CSRF token retrieved:', csrfToken ? 'Token available' : 'No token');
    
    console.log(`updateStaffMember: Making API request to ${ADMIN_API_URL}/users/staff/${id}`);
    
    // Attempt to use admin staff endpoint (specifically for staff updates)
    const response = await axios.put(`${ADMIN_API_URL}/users/staff/${id}`, userData, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });
    
    console.log('updateStaffMember: Received response:', response.status);
    
    return { 
      status: response.status, 
      data: response.data.user || response.data
    };
  } catch (error: any) {
    console.error(`updateStaffMember: Error updating staff member ${id}:`, error);
    console.error('updateStaffMember: Error details:', error.response?.data);
    
    return { 
      status: error?.response?.status || 500, 
      error: error?.response?.data?.message || error?.message || 'Failed to update staff member'
    };
  }
};

// Delete staff member using admin API
// If permission issues occur, this will return appropriate error
const deleteStaffMember = async (id: string): Promise<ApiResponse> => {
  console.log(`deleteStaffMember: Starting deletion of staff ID ${id}`);
  
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    console.log('deleteStaffMember: CSRF token retrieved:', csrfToken ? 'Token available' : 'No token');
    
    console.log(`deleteStaffMember: Making API request to ${ADMIN_API_URL}/users/${id}`);
    
    // Attempt to use admin endpoint (might fail if manager doesn't have permission)
    const response = await axios.delete(`${ADMIN_API_URL}/users/${id}`, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });
    
    console.log('deleteStaffMember: Received response:', response.status, response.data);
    
    return { 
      status: response.status, 
      message: response.data.message || 'Staff deleted successfully'
    };
  } catch (error: any) {
    console.error(`deleteStaffMember: Error deleting staff member ${id}:`, error);
    console.error('deleteStaffMember: Error details:', error.response?.data);
    
    return { 
      status: error?.response?.status || 500, 
      error: error?.response?.data?.message || error?.message || 'Failed to delete staff member'
    };
  }
};

// Reset staff password using admin API
// Both admins and managers can reset staff passwords
const resetStaffPassword = async (id: string, newPassword?: string): Promise<ApiResponse> => {
  console.log(`resetStaffPassword: Starting password reset for staff ID ${id}`);
  
  try {
    // Refresh CSRF token first
    await refreshCsrfToken();
    
    // Get CSRF token 
    const csrfToken = getCsrfToken();
    console.log('resetStaffPassword: CSRF token retrieved:', csrfToken ? 'Token available' : 'No token');
    
    const requestData = newPassword ? { newPassword } : {};
    console.log(`resetStaffPassword: Making API request to ${ADMIN_API_URL}/users/${id}/reset-password`);
    
    // Use the main reset password endpoint that now works for both admins and managers
    const response = await axios.post(`${ADMIN_API_URL}/users/${id}/reset-password`, requestData, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });
    
    console.log('resetStaffPassword: Received response:', response.status, response.data);
    
    return { 
      status: response.status, 
      message: response.data.message || 'Password reset successfully',
      data: response.data.tempPassword ? { tempPassword: response.data.tempPassword } : undefined
    };
  } catch (error: any) {
    console.error(`resetStaffPassword: Error resetting password for staff member ${id}:`, error);
    console.error('resetStaffPassword: Error details:', error.response?.data);
    
    return { 
      status: error?.response?.status || 500, 
      error: error?.response?.data?.message || error?.message || 'Failed to reset password'
    };
  }
};

const userService = {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  getAdminUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
  resetUserPassword,
  // Manager functions using real endpoints
  getManagerStaff,
  updateStaffMember,
  createStaffMember,
  deleteStaffMember,
  resetStaffPassword
};

export default userService;
