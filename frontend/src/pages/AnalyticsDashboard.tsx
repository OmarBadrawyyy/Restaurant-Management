import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import analyticsService, { DashboardAnalytics } from '../services/analyticsService';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { 
  FaChartLine as ChartLineIcon, 
  FaChartBar as ChartBarIcon, 
  FaUsers as UsersIcon, 
  FaBoxes as BoxesIcon, 
  FaStar as StarIcon,
  FaUser,
  FaUserTag,
  FaBriefcase,
  FaUserPlus,
  FaSync,
  FaExclamationTriangle
} from 'react-icons/fa';
import IconWrapper from '../components/IconWrapper';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AnalyticsDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; type: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Function to fetch dashboard data with error handling
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await analyticsService.getDashboardAnalytics();
      setDashboardData(data);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      
      let errorMessage = 'Failed to load analytics data.';
      let errorType = 'UNKNOWN_ERROR';
      
      if (err.response) {
        // Handle specific error types based on response status
        if (err.response.status === 504) {
          errorMessage = 'Database query timed out. Please try again or consider filtering your data.';
          errorType = 'TIMEOUT_ERROR';
        } else if (err.response.status === 401 || err.response.status === 403) {
          errorMessage = 'You are not authorized to view this data.';
          errorType = 'AUTH_ERROR';
        } else if (err.response.status >= 500) {
          errorMessage = 'Server error occurred. Our team has been notified.';
          errorType = 'SERVER_ERROR';
        }
        
        // Use server provided error message if available
        if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        }
        
        // Use server provided error type if available
        if (err.response.data && err.response.data.error) {
          errorType = err.response.data.error;
        }
      } else if (err.request) {
        // No response received
        errorMessage = 'Could not connect to the server. Check your internet connection.';
        errorType = 'NETWORK_ERROR';
      }
      
      setError({ message: errorMessage, type: errorType });
      setIsLoading(false);
    }
  }, []);

  // Fetch data when component mounts
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, retryCount]);

  // Function to handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p className="font-bold">Error</p>
          <p>You must be logged in to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Link 
            to="/admin" 
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center"
          >
            <span className="mr-1">←</span> Back
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
        </div>
        <button 
          onClick={handleRetry}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconWrapper icon={FaSync} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <LoadingSpinner size="large" message="Loading analytics data..." />
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-md" role="alert">
          <div className="flex items-center mb-2">
            <IconWrapper icon={FaExclamationTriangle} className="text-red-500 mr-2 text-xl" />
            <p className="font-bold">Error: {error.type}</p>
          </div>
          <p>{error.message}</p>
          <button 
            onClick={handleRetry}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Try Again
          </button>
        </div>
      ) : dashboardData ? (
        <>
          {/* System Statistics */}
          {dashboardData.systemStats && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">System Statistics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6 flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-3 mr-4">
                    <IconWrapper icon={FaUser} className="text-xl text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">Total Users</h3>
                    <span className="text-2xl font-bold">{dashboardData.systemStats.totalUsers}</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6 flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-full p-3 mr-4">
                    <IconWrapper icon={FaUserTag} className="text-xl text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">Total Customers</h3>
                    <span className="text-2xl font-bold">{dashboardData.systemStats.totalCustomers}</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6 flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-full p-3 mr-4">
                    <IconWrapper icon={FaBriefcase} className="text-xl text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">Total Staff</h3>
                    <span className="text-2xl font-bold">{dashboardData.systemStats.totalStaff}</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6 flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 rounded-full p-3 mr-4">
                    <IconWrapper icon={FaUserPlus} className="text-xl text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">New Users Today</h3>
                    <span className="text-2xl font-bold">{dashboardData.systemStats.newUsersToday}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rest of the dashboard content */}
          {/* Analytics Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Link 
              to="/admin/analytics/sales" 
              className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
            >
              <IconWrapper icon={ChartLineIcon} className="text-3xl text-blue-600 mb-2" />
              <span className="text-gray-700 font-medium">Sales</span>
            </Link>
            
            <Link 
              to="/admin/analytics/menu-items" 
              className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
            >
              <IconWrapper icon={ChartBarIcon} className="text-3xl text-green-600 mb-2" />
              <span className="text-gray-700 font-medium">Menu Items</span>
            </Link>
            
            <Link 
              to="/admin/analytics/customers" 
              className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
            >
              <IconWrapper icon={UsersIcon} className="text-3xl text-purple-600 mb-2" />
              <span className="text-gray-700 font-medium">Customers</span>
            </Link>
            
            <Link 
              to="/admin/analytics/inventory" 
              className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
            >
              <IconWrapper icon={BoxesIcon} className="text-3xl text-yellow-600 mb-2" />
              <span className="text-gray-700 font-medium">Inventory</span>
            </Link>
            
            <Link 
              to="/admin/analytics/feedback" 
              className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
            >
              <IconWrapper icon={StarIcon} className="text-3xl text-red-600 mb-2" />
              <span className="text-gray-700 font-medium">Feedback</span>
            </Link>
          </div>
          
          {/* Sales Overview */}
          {dashboardData.sales && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Sales Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Today's Sales */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Today's Sales</h3>
                  <div className="text-3xl font-bold">${dashboardData.sales.today.total.toFixed(2)}</div>
                  <div className="text-sm text-gray-500 mt-1">{dashboardData.sales.today.count} orders</div>
                  {dashboardData.sales.growth.daily !== 0 && (
                    <div className={`text-sm mt-2 ${dashboardData.sales.growth.daily > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardData.sales.growth.daily > 0 ? '↑' : '↓'} {Math.abs(dashboardData.sales.growth.daily).toFixed(1)}% from yesterday
                    </div>
                  )}
                </div>
                
                {/* This Month's Sales */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">This Month's Sales</h3>
                  <div className="text-3xl font-bold">${dashboardData.sales.currentMonth.total.toFixed(2)}</div>
                  <div className="text-sm text-gray-500 mt-1">{dashboardData.sales.currentMonth.count} orders</div>
                  {dashboardData.sales.growth.monthly !== 0 && (
                    <div className={`text-sm mt-2 ${dashboardData.sales.growth.monthly > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardData.sales.growth.monthly > 0 ? '↑' : '↓'} {Math.abs(dashboardData.sales.growth.monthly).toFixed(1)}% from last month
                    </div>
                  )}
                </div>
                
                {/* Operational Status */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Operational Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pending Orders:</span>
                      <span className="font-semibold">{dashboardData.operations.pendingOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Today's Reservations:</span>
                      <span className="font-semibold">{dashboardData.operations.todayReservations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Low Stock Items:</span>
                      <span className={`font-semibold ${dashboardData.operations.lowStockItems > 5 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {dashboardData.operations.lowStockItems}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Recent Feedback */}
          {dashboardData.recentFeedback && dashboardData.recentFeedback.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Feedback</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.recentFeedback.map((feedback, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(feedback.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {feedback.userId ? (
                            <div className="text-sm font-medium text-gray-900">
                              {feedback.userId.firstName} {feedback.userId.lastName}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">Anonymous</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {Array(5).fill(0).map((_, i) => (
                              <span key={i} className={i < feedback.rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {feedback.comment}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-100 border-l-4 border-gray-500 text-gray-700 p-4 mb-4 rounded shadow-md" role="alert">
          <p>No analytics data available.</p>
          <button 
            onClick={handleRetry}
            className="mt-3 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard; 