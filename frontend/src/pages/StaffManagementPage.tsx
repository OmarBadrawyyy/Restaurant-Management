import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import userService, { User, ApiResponse } from '../services/userService';
import { FiRefreshCw, FiSearch } from 'react-icons/fi';
import { BiUserPlus } from 'react-icons/bi';
import axios from 'axios';
import StaffCard from '../components/StaffCard';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const IconButton = ({ 
  icon, 
  onClick, 
  className = "", 
  title,
  disabled = false
}: { 
  icon: React.ReactNode;
  onClick: () => void; 
  className?: string; 
  title: string;
  disabled?: boolean;
}) => (
  <button 
    onClick={onClick} 
    className={`inline-flex items-center justify-center p-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    title={title}
    disabled={disabled}
  >
    {icon}
    <span className="ml-1.5">{title}</span>
  </button>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StatusBadge = ({ status }: { status: string }) => {
  let bgColor = 'bg-gray-100 text-gray-800';
  
  switch (status?.toLowerCase()) {
    case 'active':
      bgColor = 'bg-green-100 text-green-800';
      break;
    case 'inactive':
      bgColor = 'bg-gray-100 text-gray-800';
      break;
    case 'suspended':
      bgColor = 'bg-red-100 text-red-800';
      break;
    case 'onleave':
    case 'on leave':
      bgColor = 'bg-yellow-100 text-yellow-800';
      break;
    case 'pending':
      bgColor = 'bg-blue-100 text-blue-800';
      break;
    default:
      bgColor = 'bg-gray-100 text-gray-800';
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
      {status}
    </span>
  );
};

// User Form Modal
interface UserFormModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSave: (user: Partial<User>) => void;
  isSaving: boolean;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, user, onClose, onSave, isSaving }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    email: '',
    role: 'staff',
    phoneNumber: '',
    status: 'active',
    isActive: true
  });
  
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber || '',
        status: user.status || 'active',
        isActive: user.isActive !== undefined ? user.isActive : true
      });
    } else {
      setFormData({
        username: '',
        email: '',
        role: 'staff',
        phoneNumber: '',
        status: 'active',
        isActive: true
      });
    }
  }, [user]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {user ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                name="username"
                id="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
              <select
                name="role"
                id="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
              <select
                name="status"
                id="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="onLeave">On Leave</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                id="isActive"
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active Account
              </label>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Confirmation Modal
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
  type?: 'danger' | 'warning' | 'info';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isProcessing = false,
  type = 'danger'
}) => {
  if (!isOpen) return null;
  
  let buttonClass = 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
  if (type === 'warning') buttonClass = 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
  if (type === 'info') buttonClass = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">{message}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${buttonClass} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50`}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Page Component
const StaffManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Check if user has manager privileges
  useEffect(() => {
    if (currentUser && currentUser.role !== 'manager' && currentUser.role !== 'admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Add effect to ensure CSRF token is valid
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
      
      console.log("Fetching staff data...");
      
      // Use getManagerStaff function which is designed for manager role
      const userData = await userService.getManagerStaff();
      console.log("Staff data response:", userData);
      
      if (userData && userData.status === 200 && userData.data) {
        console.log(`Successfully loaded ${userData.data.length} staff members`);
        setUsers(userData.data);
      } else {
        console.error("Error response from getManagerStaff:", userData);
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

  // User table fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log('Fetching users data...');
    fetchUsers();
  }, []);
  
  // Try again handler for session errors
  const handleTryAgain = async () => {
    setError(null);
    fetchUsers();
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
  
  // Handle adding a new user
  const handleAddUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };
  
  // Handle editing a user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };
  
  // Handle save user
  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      setIsSaving(true);
      console.log('Saving user data:', userData);
      
      let response: ApiResponse<User>;
      
      if (selectedUser) {
        // Update existing staff
        response = await userService.updateStaffMember(
          selectedUser._id || selectedUser.id || '', 
          userData
        );
      } else {
        // Create new staff
        response = await userService.createStaffMember(userData);
      }
      
      if (response.status === 200 || response.status === 201) {
        toast.success(selectedUser ? 'Staff updated successfully!' : 'Staff created successfully!');
        setIsModalOpen(false);
        fetchUsers(); // Refresh the staff list
      } else {
        toast.error(response.error || 'An error occurred');
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle delete user
  const handleConfirmDelete = (userId: string, userName: string) => {
    setConfirmAction({
      action: 'delete',
      userId,
      userName
    });
    setShowConfirmDialog(true);
  };
  
  // Handle reset password
  const handleResetPassword = (userId: string) => {
    setConfirmAction({
      action: 'reset',
      userId,
      userName: users.find(u => (u._id || u.id) === userId)?.username || 'staff member'
    });
    setShowPasswordModal(true);
  };
  
  // Handle status change
  const handleStatusChange = (userId: string, newStatus: string) => {
    const user = users.find(u => (u._id || u.id) === userId);
    if (!user) return;
    
    setConfirmAction({
      action: newStatus === 'active' ? 'activate' : 'suspend',
      userId,
      userName: user.username
    });
    setShowConfirmDialog(true);
  };
  
  // Handle confirm action
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    const { action, userId } = confirmAction;
    
    try {
      let response: ApiResponse;
      
      switch (action) {
        case 'delete':
          response = await userService.deleteStaffMember(userId);
          if (response.status === 200) {
            toast.success('Staff member deleted successfully');
            fetchUsers(); // Refresh the list
          } else {
            toast.error(response.error || 'Failed to delete staff member');
          }
          break;
          
        case 'reset':
          response = await userService.resetStaffPassword(userId, newPassword);
          if (response.status === 200) {
            toast.success('Password reset successfully');
            setNewPassword('');
            setShowPasswordModal(false);
          } else {
            toast.error(response.error || 'Failed to reset password');
          }
          break;
          
        case 'suspend':
        case 'activate':
          const newStatus = action === 'activate' ? 'active' : 'inactive';
          response = await userService.updateStaffMember(userId, { status: newStatus });
          if (response.status === 200) {
            toast.success(`Staff ${action === 'activate' ? 'activated' : 'suspended'} successfully`);
            fetchUsers(); // Refresh the list
          } else {
            toast.error(response.error || `Failed to ${action} staff`);
          }
          break;
      }
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage staff members, roles, and permissions</p>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error
              </p>
              <p className="text-sm text-red-500">
                {error}
              </p>
              <div className="mt-2">
                <button
                  onClick={handleTryAgain}
                  className="px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-800 hover:bg-red-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {FiSearch({ className: "h-5 w-5 text-gray-400" })}
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search by name, email, or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-1 md:flex-none gap-2">
            <select
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
            
            <select
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={fetchUsers}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {FiRefreshCw({ className: "h-4 w-4 mr-1" })}
              Refresh
            </button>
            
            <button
              onClick={handleAddUser}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {BiUserPlus({ className: "h-4 w-4 mr-1" })}
              Add Staff
            </button>
          </div>
        </div>
      </div>
      
      {/* Staff List */}
      {isLoading ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-8 w-8 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-sm text-gray-500">Loading staff members...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No staff members found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new staff member</p>
          <div className="mt-6">
            <button
              onClick={handleAddUser}
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {BiUserPlus({ className: "-ml-1 mr-2 h-5 w-5" })}
              Add Staff Member
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => (
            <StaffCard
              key={user._id || user.id}
              user={user}
              onEdit={handleEditUser}
              onDelete={(userId) => handleConfirmDelete(userId, user.username)}
              onStatusChange={handleStatusChange}
              onResetPassword={handleResetPassword}
            />
          ))}
        </div>
      )}
      
      {/* Add/Edit User Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        user={selectedUser}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        isSaving={isSaving}
      />
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {confirmAction.action === 'delete' ? 'Delete Staff Member' : 
               confirmAction.action === 'activate' ? 'Activate Staff Member' : 
               'Suspend Staff Member'}
            </h3>
            <p className="text-sm text-gray-500">
              {confirmAction.action === 'delete' 
                ? `Are you sure you want to delete ${confirmAction.userName}? This action cannot be undone.`
                : confirmAction.action === 'activate'
                ? `Are you sure you want to activate ${confirmAction.userName}?`
                : `Are you sure you want to suspend ${confirmAction.userName}?`
              }
            </p>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  confirmAction.action === 'delete' 
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                    : confirmAction.action === 'activate'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Password Reset Modal */}
      {showPasswordModal && confirmAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Reset Password for {confirmAction.userName}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter a new password or leave blank to generate a random password.
            </p>
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password (Optional)
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Leave blank for random password"
              />
            </div>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage; 