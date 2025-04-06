import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import userService, { User } from '../services/userService';
import { FiEdit } from 'react-icons/fi';
import { AiOutlineDelete } from 'react-icons/ai';
import { BiUserCheck, BiUserX } from 'react-icons/bi';
import { RiLockPasswordLine } from 'react-icons/ri';
import axios from 'axios';

// Icon Button Component to fix TypeScript issues
const IconButton = ({ 
  icon: Icon, 
  onClick, 
  className, 
  title 
}: { 
  icon: any; 
  onClick: () => void; 
  className: string; 
  title: string;
}) => (
  <button 
    onClick={onClick} 
    className={className}
    title={title}
  >
    <Icon className="h-4 w-4" />
  </button>
);

const UserManagementPage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: 'delete' | 'suspend' | 'activate' | 'reset';
    userId: string;
    userName: string;
  } | null>(null);
  
  // New password state for reset password
  const [newPassword, setNewPassword] = useState('');
  
  // Form state for editing a user
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: '',
    status: '',
  });

  // Check if user has admin privileges
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Add a new effect to ensure CSRF token is valid
  useEffect(() => {
    // When component mounts or there's an error, check for CSRF token
    const refreshCsrfToken = async () => {
      try {
        // Check if we already have a token in axios headers
        if (!axios.defaults.headers.common['X-CSRF-Token']) {
          // If not, call the /api/auth/me endpoint to refresh the session and CSRF token
          await axios.get('/api/auth/me', {
            withCredentials: true
          });
          console.log("CSRF token refreshed");
        }
      } catch (err) {
        console.error("Error refreshing CSRF token:", err);
      }
    };

    refreshCsrfToken();
  }, [error]); // Re-run if there are authentication errors

  // Handle session errors
  const handleSessionError = (error: any): boolean => {
    const errorMessage = error?.response?.data?.message || error.message;
    
    // Check if error is related to auth token or session issues
    const isAuthError = 
      error?.response?.status === 401 || 
      errorMessage?.includes('Invalid token') ||
      errorMessage?.includes('session') ||
      errorMessage?.includes('Session') ||
      errorMessage?.includes('authentication') ||
      errorMessage?.includes('Authentication');

    if (isAuthError) {
      setError('Invalid session. Please log in again.');
      return true;
    }
    return false;
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userData = await userService.getAdminUsers();
      if (userData && userData.status === 200 && userData.data) {
        setUsers(userData.data);
      } else {
        setError(userData?.error || 'Failed to load users');
        setUsers([]);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      
      // Handle session errors
      if (!handleSessionError(error)) {
        // If not a session error, display the general error
        const errorMessage = error?.response?.data?.message || 'Failed to load users';
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Try again handler for session errors
  const handleTryAgain = async () => {
    // Clear any error state
    setError(null);
    
    try {
      // Force a refresh of the auth token first
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Error during logout:', err);
      navigate('/login');
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users?.filter(user => {
    // Skip if user object is malformed
    if (!user || typeof user !== 'object') return false;
    
    const matchesSearch = 
      (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    // Enhanced status filtering to handle the new 'deleted' status
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'deleted' && user.status === 'deleted') ||
      (statusFilter !== 'deleted' && user.status === statusFilter);
    
    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  const handleOpenUserModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status || (user.isActive ? 'active' : 'inactive'),
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fix handleSubmit function with proper TypeScript types
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    try {
      setIsLoading(true);
      
      // Get a fresh CSRF token before updating user
      await refreshCsrfToken();
      
      // Get the user ID (handle both id and _id)
      const userId = String(selectedUser.id || selectedUser._id);
      
      // Update the user via API
      const response = await userService.updateUser(userId, editForm);
      
      if (response.status === 200 && response.data) {
        // Create a new array with the updated user to prevent shared references
        setUsers((prevUsers: User[]) => {
          return prevUsers.map((user: User) => {
            // Check if this is the user we just updated
            if (String(user.id || user._id) === userId) {
              // Return a new user object with updated data
              const updatedUser = response.data as User;
              return {
                ...user,
                ...updatedUser,
                role: updatedUser.role,
                status: updatedUser.status,
                isActive: updatedUser.status === 'active'
              };
            }
            // Return the unchanged user
            return user;
          });
        });
        
        toast.success('User updated successfully');
        setIsModalOpen(false);
      } else {
        toast.error(response.error || 'Failed to update user. Please try again.');
      }
    } catch (err: any) {
      // Handle session errors
      if (!handleSessionError(err)) {
        toast.error(err.response?.data?.message || 'Failed to update user. Please try again.');
      }
      console.error('Error updating user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Show confirmation dialog for potentially destructive actions
  const showConfirmationDialog = (action: 'delete' | 'suspend' | 'activate' | 'reset', user: User) => {
    const userId = String(user.id || user._id || '');
    setConfirmAction({
      action,
      userId,
      userName: user.username
    });
    setShowConfirmDialog(true);
  };

  // Handle confirmation of actions
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    const { action, userId } = confirmAction;
    
    try {
      setIsLoading(true);
      
      // Get a fresh CSRF token before any action
      await refreshCsrfToken();
      
      switch (action) {
        case 'delete':
          await handleDeleteUser(userId);
          break;
        case 'suspend':
          await handleStatusChange(userId, 'suspended');
          break;
        case 'activate':
          await handleStatusChange(userId, 'active');
          break;
        case 'reset':
          await handleResetPassword(userId);
          break;
      }
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  // Handle delete user handler
  const handleDeleteUser = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Get a fresh CSRF token before deletion
      await refreshCsrfToken();
      
      // Delete the user via API
      const response = await userService.deleteUser(userId);
      
      if (response && response.status === 200) {
        // Remove the user from the local state
        setUsers(prevUsers => prevUsers.filter(user => String(user.id || user._id) !== userId));
        toast.success('User deleted successfully');
      } else {
        toast.error(response?.error || 'Failed to delete user');
        
        // If backend returned an error, let's try a soft delete approach
        if (response.status >= 400) {
          console.warn(`User deletion failed with status ${response.status}. Attempting soft delete.`);
          
          // Find the user in our current list to get their details
          const userToSoftDelete = users.find(user => String(user.id || user._id) === userId);
          
          if (userToSoftDelete) {
            // Implement a soft-delete by updating the user status
            const softDeleteResponse = await userService.updateUser(userId, {
              status: 'deleted',
              isActive: false,
              // Anonymize user data for privacy
              email: `deleted-${Date.now()}@example.com`,
              username: `deleted-user-${Date.now()}`
            });
            
            if (softDeleteResponse && softDeleteResponse.status === 200) {
              // Update the user in the local state
              setUsers(prevUsers => prevUsers.map(user => 
                String(user.id || user._id) === userId 
                  ? { ...user, status: 'deleted', isActive: false }
                  : user
              ));
              toast.success('User has been marked as deleted');
            } else {
              toast.error('Unable to mark user as deleted');
            }
          }
        }
      }
    } catch (err: any) {
      // Handle session errors
      if (!handleSessionError(err)) {
        toast.error(err.response?.data?.message || 'Failed to delete user. Please try again.');
      }
      console.error('Error deleting user:', err);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Get a fresh CSRF token before reset
      await refreshCsrfToken();
      
      const response = await userService.resetUserPassword(userId);
      
      if (response && response.status === 200) {
        toast.success('Password reset successful');
      } else {
        toast.error(response?.error || 'Failed to reset password');
      }
    } catch (err: any) {
      // Handle session errors
      if (!handleSessionError(err)) {
        toast.error(err.response?.data?.message || 'Failed to reset password. Please try again.');
      }
      console.error('Error resetting password:', err);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  // Fix handleStatusChange function with proper TypeScript types
  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      setIsLoading(true);
      
      // Get a fresh CSRF token before status change
      await refreshCsrfToken();
      
      const response = await userService.updateUser(userId, { 
        status: newStatus,
        isActive: newStatus === 'active'
      });
      
      if (response && response.status === 200 && response.data) {
        // Create a new array with the updated user to prevent shared references
        setUsers((prevUsers: User[]) => {
          return prevUsers.map((user: User) => {
            // Check if this is the user we just updated
            if (String(user.id || user._id) === userId) {
              // Return a new user object with the updated status
              return {
                ...user,
                status: newStatus,
                isActive: newStatus === 'active'
              };
            }
            // Return the unchanged user
            return user;
          });
        });
        
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      } else {
        toast.error(response?.error || 'Failed to update user status');
      }
    } catch (err: any) {
      // Handle session errors
      if (!handleSessionError(err)) {
        toast.error(err.response?.data?.message || 'Failed to update user status. Please try again.');
      }
      console.error('Error updating user status:', err);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  // Refresh CSRF token helper function
  const refreshCsrfToken = async () => {
    try {
      // First try to get a fresh CSRF token
      const response = await axios.get('/api/csrf-token', { 
        withCredentials: true 
      });
      
      // Use the token from response if available
      if (response.data && response.data.csrfToken) {
        axios.defaults.headers.common['X-CSRF-Token'] = response.data.csrfToken;
        console.log("Fresh CSRF token applied from response");
        return;
      }
      
      // Fallback to cookie if response doesn't have token
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
        
      if (token) {
        axios.defaults.headers.common['X-CSRF-Token'] = decodeURIComponent(token);
        console.log("Fresh CSRF token applied from cookie");
        return;
      }
      
      console.warn("No CSRF token found in response or cookies");
    } catch (err) {
      console.error("Error refreshing CSRF token:", err);
    }
  };

  // Helper function for status badge color
  const getStatusBadgeClass = (status: string | boolean): string => {
    if (typeof status === 'boolean') {
      return status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }
    
    switch(status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'deleted':
        return 'bg-gray-200 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading spinner
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button 
                className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleTryAgain}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Search and filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select 
            className="px-4 py-2 border border-gray-300 rounded-md"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="customer">Customer</option>
          </select>
        </div>
        <div>
          <select 
            className="px-4 py-2 border border-gray-300 rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
        <div>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={fetchUsers}
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Users table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id || user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                      user.role === 'manager' ? 'bg-blue-100 text-blue-800' : 
                      user.role === 'staff' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      getStatusBadgeClass(user.status || user.isActive || false)
                    }`}>
                      {user.status || (user.isActive ? 'Active' : 'Inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      {user.status !== 'deleted' ? (
                        <>
                          <IconButton 
                            icon={FiEdit}
                            onClick={() => handleOpenUserModal(user)} 
                            className="p-2 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200"
                            title="Edit User"
                          />
                          <IconButton 
                            icon={RiLockPasswordLine}
                            onClick={() => showConfirmationDialog('reset', user)} 
                            className="p-2 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200"
                            title="Reset Password"
                          />
                          {user.status === 'active' || user.isActive ? (
                            <IconButton 
                              icon={BiUserX}
                              onClick={() => showConfirmationDialog('suspend', user)} 
                              className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                              title="Suspend User"
                            />
                          ) : (
                            <IconButton 
                              icon={BiUserCheck}
                              onClick={() => showConfirmationDialog('activate', user)} 
                              className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                              title="Activate User"
                            />
                          )}
                          <IconButton 
                            icon={AiOutlineDelete}
                            onClick={() => showConfirmationDialog('delete', user)} 
                            className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                            title="Delete User"
                          />
                        </>
                      ) : (
                        <span className="text-gray-500 italic">User deleted</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={editForm.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Role
                </label>
                <select
                  name="role"
                  value={editForm.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={editForm.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Action</h2>
            <p className="mb-6">
              {confirmAction.action === 'delete' && `Are you sure you want to delete ${confirmAction.userName}?`}
              {confirmAction.action === 'suspend' && `Are you sure you want to suspend ${confirmAction.userName}?`}
              {confirmAction.action === 'activate' && `Are you sure you want to activate ${confirmAction.userName}?`}
              {confirmAction.action === 'reset' && `Reset password for ${confirmAction.userName}`}
            </p>
            
            {/* Password field for reset password action */}
            {confirmAction.action === 'reset' && (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                  placeholder="Enter new password"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Password must be at least 6 characters
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  if (confirmAction.action === 'reset') {
                    setNewPassword(''); // Clear password field on cancel
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={confirmAction.action === 'reset' && (!newPassword || newPassword.length < 6)}
                className={`px-4 py-2 text-white rounded-md ${
                  confirmAction.action === 'delete' || confirmAction.action === 'suspend' 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } ${confirmAction.action === 'reset' && (!newPassword || newPassword.length < 6) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage; 