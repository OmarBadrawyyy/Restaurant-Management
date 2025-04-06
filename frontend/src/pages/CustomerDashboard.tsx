import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Dashboard state
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSubtab, setFeedbackSubtab] = useState<FeedbackSubtab>('history');
  
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
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome Back, {currentUser?.email?.split('@')[0] || 'Customer'}</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        {/* Dashboard Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 bg-black text-white">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-white bg-opacity-30 h-12 w-12 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{currentUser?.email?.split('@')[0] || 'Customer'}</h2>
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
                {/* Recent Orders Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <RecentOrders limit={5} showViewAll={true} />
                </div>
                
                {/* Upcoming Reservations Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Upcoming Reservations</h3>
                    <button 
                      onClick={() => handleTabChange('reservations')}
                      className="text-yellow-600 hover:text-yellow-700 text-sm font-medium flex items-center"
                    >
                      View All
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
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