import React, { useState, useEffect } from 'react';
<<<<<<< Updated upstream
import { useSearchParams, useNavigate } from 'react-router-dom';
=======
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
>>>>>>> Stashed changes
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';
import RecentOrders from '../components/RecentOrders';
import OrdersList from '../components/OrdersList';
import ProfileForm from '../components/ProfileForm';
import FeedbackForm from '../components/FeedbackForm';
import FeedbackHistory from '../components/FeedbackHistory';
import { Box, Tabs, Tab } from '@mui/material';
import ReservationForm from '../components/ReservationForm';
import ReservationsList from '../components/ReservationsList';

// Types
type DashboardTab = 'overview' | 'orders' | 'reservations' | 'profile' | 'feedback';
type FeedbackSubtab = 'form' | 'history';

const CustomerDashboard: React.FC = () => {
<<<<<<< Updated upstream
  const { currentUser } = useAuth();
=======
  const { currentUser, logout } = useAuth();
>>>>>>> Stashed changes
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Dashboard state
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSubtab, setFeedbackSubtab] = useState<FeedbackSubtab>('history');
<<<<<<< Updated upstream
=======
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
>>>>>>> Stashed changes
  
  // Data state
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<any[]>([]);
  
  // Handle URL parameters for tab selection
  useEffect(() => {
    const tab = searchParams.get('tab') as DashboardTab | null;
    
    // Validate tab parameter
    const validTabs: DashboardTab[] = ['overview', 'orders', 'reservations', 'profile', 'feedback'];
    
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    } else if (searchParams.has('tab')) {
      // Invalid tab parameter - reset to overview
      setActiveTab('overview');
      setSearchParams({ tab: 'overview' });
    } else {
      // No tab parameter - set to overview and update URL
      setSearchParams({ tab: 'overview' });
    }
  }, [searchParams, setSearchParams]);
  
<<<<<<< Updated upstream
=======
  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
>>>>>>> Stashed changes
  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch recent orders - wrap in try/catch to prevent route errors
        try {
          const ordersResponse = await axios.get('/api/orders');
          const ordersData = ordersResponse.data.data;
          setRecentOrders(ordersData.slice(0, 5)); // Show only 5 most recent
        } catch (orderErr) {
          console.log('Orders API not available yet');
          setRecentOrders([]);
        }
        
        // Fetch upcoming reservations - wrap in try/catch to prevent route errors
        try {
          const reservationsResponse = await axios.get('/api/bookings/my-bookings');
          const reservationsData = reservationsResponse.data.data.bookings;
          const upcoming = reservationsData.filter((booking: any) => 
            new Date(booking.date) >= new Date()
          ).slice(0, 3); // Show only 3 upcoming
          setUpcomingReservations(upcoming);
        } catch (bookingErr) {
          console.log('Bookings API not available yet');
          setUpcomingReservations([]);
        }
        
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        // Don't set error or show toast for 404 errors to avoid "Route not found"
        if (err.response?.status !== 404) {
          setError(err.response?.data?.message || 'Failed to load dashboard data');
          toast.error('Failed to load dashboard data');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser]);
  
  // Handle tab change
  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  // Handle placing an order
  const handlePlaceOrder = () => {
    navigate('/menu-items');
  };
  
  // Handle feedback subtab change
  const handleFeedbackSubtabChange = (event: React.SyntheticEvent, newValue: FeedbackSubtab) => {
    setFeedbackSubtab(newValue);
  };
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Render loading state
  if (isLoading && !activeTab) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }
  
  return (
<<<<<<< Updated upstream
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome Back, {currentUser?.email?.split('@')[0] || 'Customer'}</h1>
=======
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-2">
              <Link to="/customer" className="flex items-center space-x-2">
                <div className="flex-shrink-0 bg-blue-600 text-white p-2 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span className="font-bold text-lg">RestaurantManager</span>
              </Link>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-4">
                <Link 
                  to="/customer?tab=overview" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'overview' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  My Dashboard
                </Link>
                <Link 
                  to="/menu-items" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                >
                  Menu
                </Link>
              </div>
            </div>
            
            {/* User Profile Menu */}
            <div className="relative user-menu-container">
              <button 
                className="flex items-center space-x-2 text-sm focus:outline-none"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                    {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
                </div>
                <div className="text-sm hidden md:flex md:flex-col md:items-start">
                  <span className="font-medium truncate max-w-[120px]">
                    {currentUser?.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-xs text-gray-500">Customer</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1">
                  <Link 
                    to="/customer?tab=profile" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Your Profile
                  </Link>
                  <Link 
                    to="/customer?tab=orders" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Your Orders
                  </Link>
                  <Link 
                    to="/customer?tab=reservations" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Your Reservations
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                      navigate('/login');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 pt-8">
        {/* Welcome Banner - Now smaller since we have the top navbar */}
        <div className="flex flex-wrap items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back, {currentUser?.email?.split('@')[0] || 'Customer'}</h1>
>>>>>>> Stashed changes
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        {/* Dashboard Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
<<<<<<< Updated upstream
              <div className="p-6 bg-black text-white">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-white bg-opacity-30 h-12 w-12 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
=======
              <div className="p-6 bg-gradient-to-r from-black to-gray-800 text-white">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-gradient-to-br from-white/30 to-white/10 h-14 w-14 flex items-center justify-center shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
>>>>>>> Stashed changes
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{currentUser?.email?.split('@')[0] || 'Customer'}</h2>
<<<<<<< Updated upstream
                    <p className="text-sm opacity-80">{currentUser?.email}</p>
                  </div>
                </div>
              </div>
              
              <nav className="p-4">
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => handleTabChange('overview')}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === 'overview' 
                          ? 'bg-black text-white' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span>Overview</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleTabChange('orders')}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === 'orders' 
                          ? 'bg-black text-white' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span>My Orders</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleTabChange('reservations')}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === 'reservations' 
                          ? 'bg-black text-white' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>My Reservations</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleTabChange('profile')}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === 'profile' 
                          ? 'bg-black text-white' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleTabChange('feedback')}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === 'feedback' 
                          ? 'bg-black text-white' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span>Feedback</span>
                    </button>
                  </li>
                </ul>
=======
                    <div className="flex items-center text-sm opacity-80">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate max-w-[120px]">{currentUser?.email}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleTabChange('profile')}
                  className="mt-4 w-full py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded text-white/90 flex items-center justify-center transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
              
              <nav className="p-4">
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">Dashboard</p>
                  <ul className="space-y-1">
                    <li>
                      <button
                        onClick={() => handleTabChange('overview')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          activeTab === 'overview' 
                            ? 'bg-black text-white shadow-md' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>Overview</span>
                      </button>
                    </li>
                  </ul>
                </div>
                
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">Orders & Bookings</p>
                  <ul className="space-y-1">
                    <li>
                      <button
                        onClick={() => handleTabChange('orders')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          activeTab === 'orders' 
                            ? 'bg-black text-white shadow-md' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <span>My Orders</span>
                        
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => handleTabChange('reservations')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          activeTab === 'reservations' 
                            ? 'bg-black text-white shadow-md' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>My Reservations</span>
                      </button>
                    </li>
                  </ul>
                </div>
                
                <div className="mb-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">Account</p>
                  <ul className="space-y-1">
                    <li>
                      <button
                        onClick={() => handleTabChange('profile')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          activeTab === 'profile' 
                            ? 'bg-black text-white shadow-md' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profile</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => handleTabChange('feedback')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          activeTab === 'feedback' 
                            ? 'bg-black text-white shadow-md' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <span>Feedback</span>
                      </button>
                    </li>
                  </ul>
                </div>
                
                {/* Quick Order Button */}
                <div className="px-4 pt-2 pb-4 border-t border-gray-200">
                  <button
                    onClick={() => navigate('/menu-items')}
                    className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg p-3 flex items-center justify-center space-x-2 transition-all duration-200 shadow-sm hover:shadow"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Order Now</span>
                  </button>
                </div>
>>>>>>> Stashed changes
              </nav>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            {/* Error message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}
            
            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
<<<<<<< Updated upstream
=======
                {/* Quick Actions Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => navigate('/menu-items')}
                      className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg p-5 flex flex-col items-center justify-center space-y-2 transition-all duration-200 transform hover:scale-105 shadow-md"
                    >
                      <div className="bg-white bg-opacity-20 p-3 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span className="font-medium">Place Order</span>
                      <span className="text-xs text-white text-opacity-80">Explore our menu</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('reservations')}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg p-5 flex flex-col items-center justify-center space-y-2 transition-all duration-200 transform hover:scale-105 shadow-md"
                    >
                      <div className="bg-white bg-opacity-20 p-3 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="font-medium">Book Table</span>
                      <span className="text-xs text-white text-opacity-80">Reserve your spot</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('feedback')}
                      className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white rounded-lg p-5 flex flex-col items-center justify-center space-y-2 transition-all duration-200 transform hover:scale-105 shadow-md"
                    >
                      <div className="bg-white bg-opacity-20 p-3 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <span className="font-medium">Leave Feedback</span>
                      <span className="text-xs text-white text-opacity-80">Share your experience</span>
                    </button>
                  </div>
                </div>
                
>>>>>>> Stashed changes
                {/* Recent Orders Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <RecentOrders limit={5} showViewAll={true} />
                </div>
                
<<<<<<< Updated upstream
=======
                {/* Featured Menu Items */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-800">Featured Menu Items</h3>
                    <Link 
                      to="/menu-items" 
                      className="text-yellow-600 hover:text-yellow-700 text-sm font-medium flex items-center"
                    >
                      View All Menu
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Featured Item 1 */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-40 bg-gray-200 relative">
                        <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">Popular</div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900">Signature Burger</h4>
                        <p className="text-sm text-gray-500 mt-1 mb-3">Premium beef patty with special sauce</p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900">€12.99</span>
                          <Link 
                            to="/menu-items" 
                            className="px-3 py-1 bg-black text-white text-xs rounded-full hover:bg-gray-800"
                          >
                            Order Now
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    {/* Featured Item 2 */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-40 bg-gray-200 relative">
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">New</div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900">Truffle Pasta</h4>
                        <p className="text-sm text-gray-500 mt-1 mb-3">Creamy pasta with truffle essence</p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900">€15.99</span>
                          <Link 
                            to="/menu-items" 
                            className="px-3 py-1 bg-black text-white text-xs rounded-full hover:bg-gray-800"
                          >
                            Order Now
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    {/* Featured Item 3 */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-40 bg-gray-200 relative">
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Chef's Choice</div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900">Seafood Risotto</h4>
                        <p className="text-sm text-gray-500 mt-1 mb-3">Creamy risotto with fresh seafood</p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900">€18.99</span>
                          <Link 
                            to="/menu-items" 
                            className="px-3 py-1 bg-black text-white text-xs rounded-full hover:bg-gray-800"
                          >
                            Order Now
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    {/* Featured Item 4 */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-40 bg-gray-200 relative">
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">Best Seller</div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900">Tiramisu</h4>
                        <p className="text-sm text-gray-500 mt-1 mb-3">Classic Italian dessert with coffee flavor</p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900">€7.99</span>
                          <Link 
                            to="/menu-items" 
                            className="px-3 py-1 bg-black text-white text-xs rounded-full hover:bg-gray-800"
                          >
                            Order Now
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
>>>>>>> Stashed changes
                {/* Upcoming Reservations Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Upcoming Reservations</h3>
<<<<<<< Updated upstream
                    <button 
                      onClick={() => handleTabChange('reservations')}
                      className="text-yellow-600 hover:text-yellow-700 text-sm font-medium flex items-center"
=======
                    <Link 
                      to="/customer?tab=reservations" 
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
>>>>>>> Stashed changes
                    >
                      View All
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
<<<<<<< Updated upstream
                    </button>
=======
                    </Link>
>>>>>>> Stashed changes
                  </div>
                  
                  {upcomingReservations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {upcomingReservations.map((reservation) => (
                        <div key={reservation._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                          <div className="p-5 border-b border-gray-200 bg-gray-50">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <h4 className="font-semibold text-gray-900">
                                  {new Date(reservation.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </h4>
                              </div>
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirmed
                              </span>
                            </div>
                          </div>
                          <div className="p-5">
                            <div className="flex items-center text-gray-600 mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm">{reservation.time}</span>
                            </div>
                            <div className="flex items-center text-gray-600 mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span className="text-sm">{reservation.guestCount} {reservation.guestCount === 1 ? 'Guest' : 'Guests'}</span>
                            </div>
                            {reservation.specialRequests && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-500 font-medium uppercase">Special Requests</p>
                                <p className="text-sm text-gray-700 mt-1">{reservation.specialRequests}</p>
                              </div>
                            )}
                            <div className="mt-5 flex space-x-2">
                              <button 
                                onClick={() => handleTabChange('reservations')}
                                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex-1 hover:bg-gray-50"
                              >
                                Modify
                              </button>
                              <button 
                                onClick={() => {
                                  handleTabChange('reservations');
                                  // Add a small delay to ensure the tab change is complete
                                  setTimeout(() => {
                                    const element = document.getElementById(`reservation-${reservation._id}`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }, 100);
                                }}
                                className="px-3 py-2 bg-black text-white rounded-lg text-sm font-medium flex-1 hover:bg-gray-900"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
<<<<<<< Updated upstream
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-500">No upcoming reservations found.</p>
                      <button 
                        onClick={() => navigate('/reservations')}
                        className="mt-4 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
                      >
=======
                      
                      {/* Add Reservation Button */}
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleTabChange('reservations')}
                          className="h-full w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-500 transition-colors group"
                        >
                          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">Make New Reservation</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <div className="bg-white/50 p-4 rounded-full inline-flex mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-gray-700 mb-2">No upcoming reservations found</h4>
                      <p className="text-gray-500 mb-6">Book a table to reserve your spot at our restaurant</p>
                      <button 
                        onClick={() => handleTabChange('reservations')}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center mx-auto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
>>>>>>> Stashed changes
                        Make a Reservation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* My Orders tab content */}
            {activeTab === 'orders' && (
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">My Orders</h2>
                <OrdersList allowFiltering={true} />
              </div>
            )}
            
            {activeTab === 'reservations' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">My Reservations</h2>
                  <ReservationsList />
                </div>
                <div className="mt-12 pt-8 border-t">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Make a New Reservation</h2>
                  <ReservationForm onSuccess={() => {
                    toast.success('Reservation created successfully!');
                    // Refresh the reservations list
                    window.location.reload();
                  }} />
                </div>
              </div>
            )}
            
            {activeTab === 'profile' && (
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h2>
                <ProfileForm onUpdate={() => toast.success('Profile updated successfully')} />
              </div>
            )}
            
            {activeTab === 'feedback' && (
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Feedback</h2>
                <Tabs
                  value={feedbackSubtab}
                  onChange={handleFeedbackSubtabChange}
                  variant="fullWidth"
                  sx={{ mb: 3 }}
                >
                  <Tab value="history" label="My Feedback History" />
                  <Tab value="form" label="Submit New Feedback" />
                </Tabs>
                
                {feedbackSubtab === 'form' ? (
                  <FeedbackForm />
                ) : (
                  <FeedbackHistory />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard; 