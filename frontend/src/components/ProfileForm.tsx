import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

interface ProfileFormProps {
  onUpdate?: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ onUpdate }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'preferences'>('info');
  const [loading, setLoading] = useState<boolean>(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  
  // Personal Information Form
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // Preferences form
  const [preferences, setPreferences] = useState({
    receivePromotions: false,
    receiveOrderUpdates: true,
    defaultDeliveryMethod: 'pickup',
  });
  
  // Fetch user profile data if not available through useAuth
  const fetchUserProfile = async () => {
    try {
      setIsLoadingProfile(true);
      // Use the correct API endpoint based on backend routes
      const response = await axios.get('/api/auth/profile');
      console.log('Fetched profile data structure:', {
        status: response.status,
        data: response.data,
        keys: Object.keys(response.data),
        hasData: 'data' in response.data,
        hasUser: 'user' in response.data,
        dataKeys: response.data.data ? Object.keys(response.data.data) : [],
        userKeys: response.data.user ? Object.keys(response.data.user) : [],
        hasAddresses: response.data.data?.addresses || response.data.user?.addresses || response.data.addresses,
        hasPhone: !!response.data.data?.phone || !!response.data.user?.phone || !!response.data.phone
      });
      
      // Return the appropriate data structure - different endpoints have different responses
      if (response.data.data) {
        return response.data.data;
      } else if (response.data.user) {
        return response.data.user;
      } else {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Try fallback to /api/auth/me endpoint
      try {
        const meResponse = await axios.get('/api/auth/me');
        console.log('Fetched profile from /me endpoint structure:', {
          status: meResponse.status,
          data: meResponse.data,
          keys: Object.keys(meResponse.data),
          hasUser: 'user' in meResponse.data,
          userKeys: meResponse.data.user ? Object.keys(meResponse.data.user) : [],
          hasAddresses: meResponse.data.user?.addresses || meResponse.data.addresses,
          hasPhone: !!meResponse.data.user?.phone || !!meResponse.data.phone
        });
        
        return meResponse.data.user || meResponse.data;
      } catch (fallbackError) {
        console.error('Fallback profile fetch failed:', fallbackError);
        toast.error('Failed to load profile data');
        return null;
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };
  
  // Initialize user data
  const initializeUserData = (userData: any) => {
    if (!userData) return;
    
    console.log('Initializing user data with:', userData);
    console.log('User data keys:', Object.keys(userData));
    console.log('Has addresses?', 'addresses' in userData, userData.addresses);
    console.log('Has phone?', 'phone' in userData, userData.phone);
    console.log('Has phoneNumber?', 'phoneNumber' in userData, userData.phoneNumber);
    console.log('Has address object?', 'address' in userData, userData.address);
    
    // Extract address data from different possible sources
    // 1. Default address from addresses array
    let defaultAddress = null;
    if (userData.addresses && userData.addresses.length > 0) {
      defaultAddress = userData.addresses.find((addr: any) => addr.isDefault) || userData.addresses[0];
      console.log('Found address in addresses array:', defaultAddress);
    }
    
    // 2. Address from direct address object (may come from API response)
    let directAddress = null;
    if (userData.address && typeof userData.address === 'object') {
      directAddress = userData.address;
      console.log('Found direct address object:', directAddress);
    }
    
    console.log('Default address from userData:', defaultAddress);
    
    // Try to load saved address data from localStorage
    let localAddress;
    try {
      const savedAddress = localStorage.getItem('user_address_data');
      if (savedAddress) {
        localAddress = JSON.parse(savedAddress);
        console.log('Found address data in localStorage:', localAddress);
      }
    } catch (e) {
      console.error('Error parsing saved address data', e);
    }
    
    // Get phone from any source available
    const savedPhone = localStorage.getItem('user_phone');
    const apiPhone = userData.phone || userData.phoneNumber;
    console.log('Saved phone from localStorage:', savedPhone);
    console.log('API phone:', apiPhone);
    
    // If we have a phone number from the backend but not in localStorage, save it
    if (!savedPhone && apiPhone) {
      localStorage.setItem('user_phone', apiPhone);
      console.log('Saved phone number to localStorage:', apiPhone);
    }
    
    // Determine best address source in priority order:
    // 1. localStorage (for offline persistence)
    // 2. Direct address object from API
    // 3. Default address from addresses array
    const bestAddress = localAddress || directAddress || defaultAddress;
    console.log('Using best address source:', bestAddress);
    
    // Set profile form data with prioritized sources
    setProfileForm({
      username: userData?.username || '',
      email: userData?.email || '',
      // Phone: priority order - localStorage -> API phone -> API phoneNumber
      phone: savedPhone || apiPhone || '',
      // Address fields
      address: bestAddress?.street || '',
      city: bestAddress?.city || '',
      state: bestAddress?.state || '',
      zipCode: bestAddress?.zipCode || bestAddress?.postalCode || '',
    });
    
    console.log('Set profile form with data:', {
      username: userData?.username || '',
      email: userData?.email || '',
      phone: savedPhone || apiPhone || '',
      hasAddressData: !!bestAddress
    });
    
    // Initialize preferences
    if (userData?.preferences) {
      console.log('Found preferences in userData:', userData.preferences);
      
      // Check if we need to handle different preference formats
      const preferencesStructure = {
        hasCommPref: 'communicationPreferences' in userData.preferences,
        directProperties: {
          hasReceivePromotions: 'receivePromotions' in userData.preferences,
          hasReceiveOrderUpdates: 'receiveOrderUpdates' in userData.preferences
        }
      };
      
      console.log('Preferences structure:', preferencesStructure);
      
      setPreferences({
        // Try both nested and direct preference structures
        receivePromotions: 
          userData.preferences.communicationPreferences?.email ?? 
          userData.preferences.receivePromotions ?? 
          false,
        
        receiveOrderUpdates: 
          userData.preferences.communicationPreferences?.orderUpdates ?? 
          userData.preferences.receiveOrderUpdates ?? 
          true,
        
        defaultDeliveryMethod: userData.preferences.defaultDeliveryMethod || 'pickup',
      });
    }
  };
  
  useEffect(() => {
    const loadUserData = async () => {
      // Use currentUser data if available
      if (currentUser) {
        console.log('Using currentUser data:', currentUser);
        initializeUserData(currentUser);
      }
      
      // Always fetch fresh data from API to ensure we have latest
      const userData = await fetchUserProfile();
      if (userData) {
        console.log('Got userData from API:', userData);
        initializeUserData(userData);
      }
      
      setIsLoadingProfile(false);
    };
    
    loadUserData();
  }, [currentUser]);
  
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setPreferences(prev => ({ ...prev, [name]: checked }));
    } else {
      setPreferences(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const validateProfile = () => {
    if (!profileForm.username.trim()) return 'Username is required';
    if (!profileForm.email.trim()) return 'Email is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileForm.email)) return 'Please enter a valid email address';
    
    return null;
  };
  
  const validatePassword = () => {
    // Check if current password is provided
    if (!passwordForm.currentPassword) {
      return 'Current password is required';
    }
    
    // Validate new password
    if (!passwordForm.newPassword) {
      return 'New password is required';
    }
    
    // Check password strength
    if (passwordForm.newPassword.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    // Password complexity check - uncomment if needed
    // const hasUpperCase = /[A-Z]/.test(passwordForm.newPassword);
    // const hasLowerCase = /[a-z]/.test(passwordForm.newPassword);
    // const hasNumbers = /\d/.test(passwordForm.newPassword);
    // const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword);
    
    // if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
    //   return 'Password must include uppercase, lowercase letters and numbers';
    // }
    
    // Check if passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return 'New password and confirmation do not match';
    }
    
    // All validations passed
    return null;
  };
  
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateProfile();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare address data for API submission and local storage
      const addressData = {
        street: profileForm.address,
        city: profileForm.city,
        state: profileForm.state,
        zipCode: profileForm.zipCode
      };
      
      // Store in localStorage as backup and for display
      localStorage.setItem('user_address_data', JSON.stringify(addressData));
      localStorage.setItem('user_phone', profileForm.phone);
      
      console.log('Stored address and phone in localStorage');
      
      // Prepare user data for API update - include phone and address
      const profileData = {
        username: profileForm.username,
        email: profileForm.email,
        phone: profileForm.phone,
        fullName: currentUser && 'fullName' in currentUser ? currentUser.fullName : '',
        address: addressData
      };
      
      console.log('Updating profile with data:', profileData);
      
      // Update through API
      let response = await axios.put('/api/auth/profile', profileData, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      });
      
      console.log('Profile update response:', response.data);
      
      toast.success('Profile information updated');
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validatePassword();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    setLoading(true);
    
    try {
      // Use the correct password change endpoint
      const response = await axios.post('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      console.log('Password update response:', response.data);
      
      // Show success message with more detail
      toast.success('Password updated successfully');
      
      // Reset password form after successful change
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Automatically switch back to profile tab after successful password change
      setTimeout(() => {
        setActiveTab('info');
        toast('Returning to profile information', { icon: 'ℹ️' });
      }, 1500);
    } catch (error: any) {
      console.error('Error updating password:', error);
      // Show more descriptive error message based on server response
      if (error.response?.status === 401) {
        toast.error('Current password is incorrect');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      // Update preferences through the profile update endpoint
      // Map preferences to match the backend schema
      const userData = {
        preferences: {
          communicationPreferences: {
            email: preferences.receivePromotions,
            orderUpdates: preferences.receiveOrderUpdates,
          },
          defaultDeliveryMethod: preferences.defaultDeliveryMethod
        }
      };
      
      const response = await axios.put('/api/auth/profile', userData);
      console.log('Preferences update response:', response.data);
      
      toast.success('Preferences updated successfully');
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      toast.error(error.response?.data?.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };
  
  // Update render section to handle loading state
  if (isLoadingProfile) {
    return (
      <div className="w-full flex justify-center items-center py-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'info'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('info')}
          >
            Personal Information
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('password')}
          >
            Change Password
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preferences'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
        </div>
      </div>
      
      {/* Personal Information Form */}
      {activeTab === 'info' && (
        <form onSubmit={handleProfileSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={profileForm.username}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={profileForm.phone}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mt-8 mb-4">Address Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={profileForm.address}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={profileForm.city}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={profileForm.state}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Zip/Postal Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={profileForm.zipCode}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
      
      {/* Password Change Form */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="max-w-md">
          <div className="space-y-6">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  passwordForm.currentPassword ? 'border-gray-300' : 'border-red-300'
                }`}
                required
              />
              {!passwordForm.currentPassword && (
                <p className="mt-1 text-xs text-red-500">Current password is required</p>
              )}
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  passwordForm.newPassword && passwordForm.newPassword.length >= 8 
                    ? 'border-green-300' 
                    : passwordForm.newPassword 
                      ? 'border-yellow-300' 
                      : 'border-red-300'
                }`}
                required
                minLength={8}
              />
              <p className={`mt-1 text-xs ${passwordForm.newPassword && passwordForm.newPassword.length >= 8 ? 'text-green-500' : 'text-gray-500'}`}>
                Password must be at least 8 characters
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  passwordForm.confirmPassword && passwordForm.confirmPassword === passwordForm.newPassword
                    ? 'border-green-300'
                    : passwordForm.confirmPassword
                      ? 'border-yellow-300'
                      : 'border-red-300'
                }`}
                required
              />
              {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
          </div>
          
          <div className="mt-8">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
      
      {/* Preferences Form */}
      {activeTab === 'preferences' && (
        <form onSubmit={handlePreferencesSubmit}>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="receiveOrderUpdates"
                      name="receiveOrderUpdates"
                      checked={preferences.receiveOrderUpdates}
                      onChange={handlePreferenceChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="receiveOrderUpdates" className="font-medium text-gray-700">
                      Order Updates
                    </label>
                    <p className="text-gray-500">Receive notifications about your order status</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="receivePromotions"
                      name="receivePromotions"
                      checked={preferences.receivePromotions}
                      onChange={handlePreferenceChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="receivePromotions" className="font-medium text-gray-700">
                      Promotions and Offers
                    </label>
                    <p className="text-gray-500">Receive promotional emails and special offers</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ordering Preferences</h3>
              
              <div>
                <label htmlFor="defaultDeliveryMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Default Delivery Method
                </label>
                <select
                  id="defaultDeliveryMethod"
                  name="defaultDeliveryMethod"
                  value={preferences.defaultDeliveryMethod}
                  onChange={handlePreferenceChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pickup">Pickup</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ProfileForm; 