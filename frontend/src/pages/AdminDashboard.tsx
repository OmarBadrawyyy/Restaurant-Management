import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import analyticsService from '../services/analyticsService';

// Import new UI components
import DashboardLayout from '../components/ui/DashboardLayout';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatsCard from '../components/ui/StatsCard';
import Badge from '../components/ui/Badge';

interface DashboardStats {
  totalUsers: number;
  totalCustomers: number;
  totalStaff: number;
  newUsersToday: number;
}

interface DashboardData {
  systemStats: DashboardStats;
  timestamp: string;
  sales?: {
    today: {
      total: number;
      count: number;
    };
    currentMonth: {
      total: number;
      count: number;
    };
    growth: {
      daily: number;
      monthly: number;
    };
  };
  operations?: {
    pendingOrders: number;
    todayReservations: number;
    lowStockItems: number;
  };
  recentFeedback?: any[];
}

// Issue status map for badges
const issueStatusMap = {
  'pending': { variant: 'warning', label: 'Pending' },
  'urgent': { variant: 'danger', label: 'Urgent' },
  'resolved': { variant: 'success', label: 'Resolved' },
};

const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch from real analytics endpoint
        const data = await analyticsService.getDashboardAnalytics();
        setDashboardData(data);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You don't have permission to access the admin dashboard.</p>
        <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Return to Home
        </Link>
      </div>
    );
  }

  // Function to render icon with proper styling
  const renderIcon = (type: string) => {
    switch(type) {
      case 'users':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'menu':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'tables':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'orders':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'analytics':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'calendar':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-gray-100">
      <DashboardLayout
        title="Admin Dashboard"
        subtitle="Manage your restaurant system"
        className="px-6 py-8"
      >
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg shadow-sm" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Admin Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card 
            className="bg-white/70 backdrop-blur-sm border-0 shadow-lg shadow-blue-100/50 transition-all hover:shadow-xl hover:scale-[1.02]"
            isHoverable
            noPadding
          >
            <Link to="/admin/users" className="block p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  {renderIcon('users')}
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                  <p className="text-gray-600">Manage users and roles</p>
                </div>
              </div>
            </Link>
          </Card>

          <Card 
            className="bg-white/70 backdrop-blur-sm border-0 shadow-lg shadow-emerald-100/50 transition-all hover:shadow-xl hover:scale-[1.02]"
            isHoverable
            noPadding
          >
            <Link to="/admin/menu" className="block p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                  {renderIcon('menu')}
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-800">Menu Management</h2>
                  <p className="text-gray-600">Manage food items and categories</p>
                </div>
              </div>
            </Link>
          </Card>

          <Card 
            className="bg-white/70 backdrop-blur-sm border-0 shadow-lg shadow-amber-100/50 transition-all hover:shadow-xl hover:scale-[1.02]"
            isHoverable
            noPadding
          >
            <Link to="/admin/tables" className="block p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                  {renderIcon('tables')}
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-800">Table Management</h2>
                  <p className="text-gray-600">Manage restaurant tables</p>
                </div>
              </div>
            </Link>
          </Card>

          <Card 
            className="bg-white/70 backdrop-blur-sm border-0 shadow-lg shadow-violet-100/50 transition-all hover:shadow-xl hover:scale-[1.02]"
            isHoverable
            noPadding
          >
            <Link to="/admin/reservations" className="block p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white">
                  {renderIcon('calendar')}
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-800">Reservations</h2>
                  <p className="text-gray-600">Manage table reservations</p>
                </div>
              </div>
            </Link>
          </Card>

          <Card 
            className="bg-white/70 backdrop-blur-sm border-0 shadow-lg shadow-indigo-100/50 transition-all hover:shadow-xl hover:scale-[1.02]"
            isHoverable
            noPadding
          >
            <Link to="/admin/analytics" className="block p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                  {renderIcon('analytics')}
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-800">Analytics</h2>
                  <p className="text-gray-600">View business insights and reports</p>
                </div>
              </div>
            </Link>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="mb-10">
          <PageHeader title="System Statistics" className="mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Users"
              value={isLoading ? "..." : (dashboardData?.systemStats?.totalUsers || 0)}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              iconClassName="bg-gradient-to-br from-blue-500 to-blue-600 text-white"
              className="bg-white/70 backdrop-blur-sm shadow-lg shadow-blue-100/50"
              isLoading={isLoading}
            />
            
            <StatsCard
              title="Total Customers"
              value={isLoading ? "..." : (dashboardData?.systemStats?.totalCustomers || 0)}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              iconClassName="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
              className="bg-white/70 backdrop-blur-sm shadow-lg shadow-emerald-100/50"
              isLoading={isLoading}
            />
            
            <StatsCard
              title="Total Staff"
              value={isLoading ? "..." : (dashboardData?.systemStats?.totalStaff || 0)}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              iconClassName="bg-gradient-to-br from-amber-500 to-amber-600 text-white"
              className="bg-white/70 backdrop-blur-sm shadow-lg shadow-amber-100/50"
              isLoading={isLoading}
            />
            
            <StatsCard
              title="New Users Today"
              value={isLoading ? "..." : (dashboardData?.systemStats?.newUsersToday || 0)}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              }
              iconClassName="bg-gradient-to-br from-violet-500 to-violet-600 text-white"
              className="bg-white/70 backdrop-blur-sm shadow-lg shadow-violet-100/50"
              isLoading={isLoading}
              trend={(dashboardData?.systemStats?.newUsersToday ?? 0) > 0 ? 'up' : 'neutral'}
            />
          </div>
        </div>

        {/* Quick Support Issues */}
        <div>
          <PageHeader 
            title="Recent Support Issues" 
            actions={
              <Link 
                to="/admin/support" 
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                View All Issues
              </Link>
            }
          />
          
          <Card elevation="low" className="bg-white/70 backdrop-blur-sm shadow-lg overflow-hidden rounded-xl">
            <div className="divide-y divide-gray-200/50">
              <div className="p-5 flex justify-between items-center hover:bg-gray-50/50 transition-colors">
                <div>
                  <h3 className="text-base font-medium text-gray-800">Unable to login to account</h3>
                  <p className="text-sm text-gray-500">customer@example.com</p>
                </div>
                <Badge variant="warning" rounded>Pending</Badge>
              </div>
              
              <div className="p-5 flex justify-between items-center hover:bg-gray-50/50 transition-colors">
                <div>
                  <h3 className="text-base font-medium text-gray-800">Reset password not working</h3>
                  <p className="text-sm text-gray-500">john.doe@example.com</p>
                </div>
                <Badge variant="danger" rounded>Urgent</Badge>
              </div>
              
              <div className="p-5 flex justify-between items-center hover:bg-gray-50/50 transition-colors">
                <div>
                  <h3 className="text-base font-medium text-gray-800">Need to update email address</h3>
                  <p className="text-sm text-gray-500">jane.smith@example.com</p>
                </div>
                <Badge variant="success" rounded>Resolved</Badge>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    </div>
  );
};

export default AdminDashboard; 