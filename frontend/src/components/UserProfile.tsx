import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import userService, { UserProfile as UserProfileType } from '../services/userService';
import QuerySuspenseBoundary from './QuerySuspenseBoundary';
import validator from '../utils/validator';
import authService from '../services/authService';

interface ProfileFormState {
  username: string;
  email: string;
  phoneNumber: string;
  profileImage: string;
  password: string;
  newPassword: string;
  confirmPassword: string;
}

const UserProfileInner: React.FC = () => {
  const { currentUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<ProfileFormState>({
    username: '',
    email: '',
    phoneNumber: '',
    profileImage: '',
    password: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Success message
  const [successMessage, setSuccessMessage] = useState('');
  
  // Tab state (profile or password)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  // Load user data when component mounts or currentUser changes
  useEffect(() => {
    if (currentUser && typeof currentUser === 'object') {
      // Check if the form data already matches current user data to avoid unnecessary rerenders
      const userChanged = 
        formData.username !== (currentUser.username || '') ||
        formData.email !== (currentUser.email || '') ||
        formData.phoneNumber !== (currentUser.phoneNumber || '') ||
        formData.profileImage !== (currentUser.profileImage || '');
      
      // Only update if data has changed
      if (userChanged) {
        setFormData(prevData => ({
          ...prevData,
          username: currentUser.username || '',
          email: currentUser.email || '',
          phoneNumber: currentUser.phoneNumber || '',
          profileImage: currentUser.profileImage || ''
        }));
      }
    }
  }, [currentUser]);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle profile update submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate form fields
    const validationErrors: Record<string, string> = {};
    
    if (!formData.username) validationErrors.username = 'Username is required';
    if (!formData.email) {
      validationErrors.email = 'Email is required';
    } else if (!validator.validateField(formData.email, { email: true })) {
      validationErrors.email = 'Invalid email format';
    }
    
    // If there are validation errors, update state and stop submission
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Call the API to update user profile
      const profileData: UserProfileType = {
        username: formData.username,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        profileImage: formData.profileImage
      };
      
      await userService.updateProfile(profileData);
      
      setSuccessMessage('Profile updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000); // Clear message after 3 seconds
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle password update submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate password fields
    const validationErrors: Record<string, string> = {};
    
    if (!formData.password) {
      validationErrors.password = 'Current password is required';
    }
    
    if (!formData.newPassword) {
      validationErrors.newPassword = 'New password is required';
    } else if (!validator.validateField(formData.newPassword, { minLength: 6 })) {
      validationErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      validationErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }
    
    // If there are validation errors, update state and stop submission
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Call the API to update password using authService directly
      const response = await authService.changePassword(formData.password, formData.newPassword);
      
      // Reset password fields
      setFormData(prev => ({
        ...prev,
        password: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      setSuccessMessage(response.message || 'Password updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000); // Clear message after 3 seconds
    } catch (err: any) {
      console.error('Failed to update password:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update password');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg text-gray-600">Please log in to view your profile.</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Account</h1>
      
      {/* Display any API errors */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">An error occurred</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Success message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-1 text-sm text-green-700">{successMessage}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tab navigation */}
      <div className="mb-8">
        <div className="sm:hidden">
          <select
            aria-label="Selected tab"
            className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as 'profile' | 'password')}
          >
            <option value="profile">Profile Information</option>
            <option value="password">Change Password</option>
          </select>
        </div>
        <div className="hidden sm:block">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('profile')}
                className={`${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                aria-current={activeTab === 'profile' ? 'page' : undefined}
              >
                <svg className="text-current -ml-0.5 mr-2 h-5 w-5 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`${
                  activeTab === 'password'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                aria-current={activeTab === 'password' ? 'page' : undefined}
              >
                <svg className="text-current -ml-0.5 mr-2 h-5 w-5 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Change Password
              </button>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Profile form */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="bg-white shadow-md rounded-lg p-8">
          {/* Form title and description */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Profile Information</h2>
            <p className="text-gray-600">Manage your personal information</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`block w-full pr-10 rounded-md ${
                    errors.username ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } shadow-sm sm:text-sm`}
                  aria-invalid={errors.username ? 'true' : 'false'}
                  aria-describedby="username-error"
                />
                {errors.username && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.username && (
                <p className="mt-2 text-sm text-red-600" id="username-error">{errors.username}</p>
              )}
            </div>
            
            <div className="relative">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pr-10 rounded-md ${
                    errors.email ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } shadow-sm sm:text-sm`}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby="email-error"
                />
                {errors.email && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600" id="email-error">{errors.email}</p>
              )}
            </div>
            
            <div className="relative">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`block w-full pr-10 rounded-md ${
                    errors.phoneNumber ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } shadow-sm sm:text-sm`}
                  aria-invalid={errors.phoneNumber ? 'true' : 'false'}
                  aria-describedby="phoneNumber-error"
                  placeholder="(123) 456-7890"
                />
                {errors.phoneNumber && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.phoneNumber && (
                <p className="mt-2 text-sm text-red-600" id="phoneNumber-error">{errors.phoneNumber}</p>
              )}
            </div>
            
            <div className="relative">
              <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700 mb-1">
                Profile Image URL
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="text"
                  id="profileImage"
                  name="profileImage"
                  value={formData.profileImage}
                  onChange={handleChange}
                  className={`block w-full pr-10 rounded-md ${
                    errors.profileImage ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } shadow-sm sm:text-sm`}
                  aria-invalid={errors.profileImage ? 'true' : 'false'}
                  aria-describedby="profileImage-error"
                  placeholder="https://example.com/image.jpg"
                />
                {errors.profileImage && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.profileImage && (
                <p className="mt-2 text-sm text-red-600" id="profileImage-error">{errors.profileImage}</p>
              )}
            </div>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row sm:justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <button
                type="submit"
                disabled={isUpdating}
                className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
            
            {/* Last updated info */}
            <div className="text-sm text-gray-500">
              <p>Last updated: <span className="font-medium">Recently</span></p>
            </div>
          </div>
          
          {/* Profile tips box */}
          <div className="mt-8 bg-blue-50 rounded-md p-4 border border-blue-100">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Profile Information Tips</h3>
            <ul className="text-xs text-blue-700 space-y-1 list-disc pl-5">
              <li>Keeping your contact information up to date helps us serve you better</li>
              <li>Your email address is used for important notifications</li>
              <li>Profile images should be square format for best results</li>
            </ul>
          </div>
        </form>
      )}
      
      {/* Password form */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="bg-white shadow-md rounded-lg p-8">
          {/* Form title and description */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Change Your Password</h2>
            <p className="text-gray-600">Ensure your account is secure with a strong password</p>
          </div>
          
          <div className="space-y-6">
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pr-10 rounded-md ${
                    errors.password ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } shadow-sm sm:text-sm`}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby="password-error"
                />
                {errors.password && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600" id="password-error">{errors.password}</p>
              )}
            </div>
            
            <div className="relative">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className={`block w-full pr-10 rounded-md ${
                    errors.newPassword ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } shadow-sm sm:text-sm`}
                  aria-invalid={errors.newPassword ? 'true' : 'false'}
                  aria-describedby="newPassword-error"
                />
                {errors.newPassword && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.newPassword ? (
                <p className="mt-2 text-sm text-red-600" id="newPassword-error">{errors.newPassword}</p>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Must be at least 6 characters long</p>
              )}
              
              {/* Password strength meter */}
              {formData.newPassword && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Password strength:</span>
                    <span className="text-xs font-medium">
                      {formData.newPassword.length < 6 && 'Weak'}
                      {formData.newPassword.length >= 6 && formData.newPassword.length < 8 && 'Moderate'}
                      {formData.newPassword.length >= 8 && 'Strong'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        formData.newPassword.length < 6 
                          ? 'bg-red-500 w-1/3' 
                          : formData.newPassword.length < 8
                            ? 'bg-yellow-500 w-2/3'
                            : 'bg-green-500 w-full'
                      }`}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`block w-full pr-10 rounded-md ${
                    errors.confirmPassword ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } shadow-sm sm:text-sm`}
                  aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  aria-describedby="confirmPassword-error"
                />
                {errors.confirmPassword && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {(formData.newPassword && formData.confirmPassword && formData.newPassword === formData.confirmPassword && !errors.confirmPassword) && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600" id="confirmPassword-error">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row sm:justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <button
                type="submit"
                disabled={isUpdating}
                className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Last updated: <span className="font-medium">Recently</span></p>
            </div>
          </div>
          
          {/* Password security tips */}
          <div className="mt-8 bg-blue-50 rounded-md p-4 border border-blue-100">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Password Security Tips</h3>
            <ul className="text-xs text-blue-700 space-y-1 list-disc pl-5">
              <li>Use a combination of letters, numbers, and symbols</li>
              <li>Avoid using personal information like your name or birthdate</li>
              <li>Create a password that's at least 8 characters long</li>
              <li>Don't reuse passwords across multiple sites</li>
            </ul>
          </div>
        </form>
      )}
    </div>
  );
};

// Wrapped component with suspense boundary
const UserProfile: React.FC = () => {
  return (
    <QuerySuspenseBoundary loadingMessage="Loading profile data...">
      <UserProfileInner />
    </QuerySuspenseBoundary>
  );
};

export default UserProfile; 