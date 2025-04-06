import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import analyticsService, { MenuItemsAnalytics } from '../services/analyticsService';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { format, subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

// Add a new component to show advanced error recovery options
const ErrorRecoveryOptions: React.FC<{
  error: any;
  onRetry: () => void;
  onReduceDateRange: () => void;
}> = ({ error, onRetry, onReduceDateRange }) => {
  // Determine specific error types
  const isTimeout = error?.response?.status === 504 || 
                   (error?.response?.data?.error === 'TIMEOUT_ERROR');
  
  const isMemoryError = error?.response?.data?.error === 'MEMORY_LIMIT_EXCEEDED';
  const isDatabaseError = error?.response?.data?.error === 'DATABASE_ERROR';
  
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {/* Always show retry */}
      <button 
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      >
        Try Again
      </button>
      
      {/* Show date range reduction for timeout or memory errors */}
      {(isTimeout || isMemoryError) && (
        <button 
          onClick={onReduceDateRange}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Use Smaller Date Range
        </button>
      )}
    </div>
  );
};

// Update the ErrorDisplay component to include new recovery options
const ErrorDisplay: React.FC<{
  error: any;
  onRetry: () => void;
  onDateRangeChange?: (start: string, end: string) => void;
}> = ({ error, onRetry, onDateRangeChange }) => {
  // Function to handle date range reduction to 7 days
  const handleReduceDateRange = () => {
    if (!onDateRangeChange) return;
    
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    onDateRangeChange(
      format(lastWeek, 'yyyy-MM-dd'),
      format(today, 'yyyy-MM-dd')
    );
  };
  
  // Get user-friendly error message
  const errorMessage = error?.response?.data?.message || 
                      error?.message || 
                      'Failed to load menu items data. Please try again later.';
  
  // Determine if this is a timeout error for specific messaging
  const isTimeout = error?.response?.status === 504 || 
                   (error?.response?.data?.error === 'TIMEOUT_ERROR');
  
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow" role="alert">
      <h3 className="font-bold text-lg mb-2">Error Loading Data</h3>
      <p className="mb-3">{errorMessage}</p>
      
      <ErrorRecoveryOptions
        error={error}
        onRetry={onRetry}
        onReduceDateRange={handleReduceDateRange}
      />
      
      {isTimeout && (
        <p className="text-sm mt-3 text-red-600">
          Tip: For better performance, try selecting a shorter date range (7 days or less) or use the sample data option.
        </p>
      )}
    </div>
  );
};

// Add a component to display date range warning
const DateRangeWarning: React.FC<{
  startDate: string;
  endDate: string;
}> = ({ startDate, endDate }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = differenceInDays(end, start);
  
  if (diffDays <= 5) {
    return null;
  }
  
  const severity = diffDays > 30 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700';
  
  return (
    <div className={`mt-4 p-2 border rounded text-sm ${severity}`}>
      <strong>{diffDays > 30 ? 'Warning:' : 'Note:'}</strong> {' '}
      {diffDays > 30 
        ? 'Large date ranges (over 30 days) may result in timeouts and degraded performance.'
        : 'Date ranges over 5 days may affect query performance. Consider using a shorter range for better results.'}
    </div>
  );
};

const MenuItemsAnalyticsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [menuItemsData, setMenuItemsData] = useState<MenuItemsAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  const [wasRangeTruncated, setWasRangeTruncated] = useState(false);
  const [originalEndDate, setOriginalEndDate] = useState<string | null>(null);

  // Function to fetch data
  const fetchMenuItemsData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setWasRangeTruncated(false);
      setOriginalEndDate(null);
      
      const data = await analyticsService.getMenuItemsAnalytics(
        dateRange.startDate,
        dateRange.endDate,
        page,
        limit
      );
      
      // Check if date range was reduced by the service
      if (data._reducedDateRange) {
        setWasRangeTruncated(true);
        setOriginalEndDate(data._originalEndDate || null);
      }
      
      setMenuItemsData(data);
    } catch (err: any) {
      console.error('Error fetching menu items analytics:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate, page, limit]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchMenuItemsData();
  }, [fetchMenuItemsData]);

  // Handle date range changes
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({
      ...prev,
      startDate: e.target.value
    }));
  };
  
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({
      ...prev,
      endDate: e.target.value
    }));
  };
  
  // Update both start and end dates at once
  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({
      startDate: start,
      endDate: end
    });
  };
  
  // Set predefined date ranges
  const setLastWeek = () => {
    const end = new Date();
    const start = subDays(end, 7);
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  };
  
  const setLastMonth = () => {
    const end = new Date();
    const start = subDays(end, 30);
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  };
  
  const setThisMonth = () => {
    const today = new Date();
    setDateRange({
      startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(today), 'yyyy-MM-dd')
    });
  };

  // Handle pagination
  const handleNextPage = () => {
    if (menuItemsData && page < menuItemsData.pagination.totalPages) {
      setPage(page + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You don't have permission to access the menu items analytics.</p>
        <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Return to Home
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Menu Items Analytics</h1>
          <p className="text-gray-600">Analyze popular and unpopular menu items</p>
        </div>
        
        <Link 
          to="/admin/analytics" 
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Back to Dashboard
        </Link>
      </div>
      
      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={handleStartDateChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={handleEndDateChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <button 
              onClick={setLastWeek}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Last 7 Days
            </button>
            <button 
              onClick={setLastMonth}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Last 30 Days
            </button>
            <button 
              onClick={setThisMonth}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              This Month
            </button>
          </div>
        </div>
        
        {/* Date range warnings */}
        <DateRangeWarning startDate={dateRange.startDate} endDate={dateRange.endDate} />
        
        {/* Truncated date range notice */}
        {wasRangeTruncated && originalEndDate && (
          <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
            <strong>Note:</strong> The date range was automatically reduced to improve performance. 
            Your original request was for {dateRange.startDate} to {originalEndDate}, 
            but results shown are for {dateRange.startDate} to {format(new Date(menuItemsData?.period.end || ''), 'yyyy-MM-dd')}.
            <button 
              onClick={() => setDateRange(prev => ({ ...prev, endDate: originalEndDate }))}
              className="ml-2 underline hover:text-blue-800"
            >
              Reset to original range
            </button>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <LoadingSpinner message="Loading menu items data..." />
      ) : error ? (
        <ErrorDisplay 
          error={error} 
          onRetry={fetchMenuItemsData} 
          onDateRangeChange={handleDateRangeChange} 
        />
      ) : menuItemsData ? (
        <>
          {/* Most Popular Items */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Most Popular Items</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity Sold
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {menuItemsData.mostPopular && menuItemsData.mostPopular.length > 0 ? (
                      menuItemsData.mostPopular.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.totalQuantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.totalRevenue.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.averagePrice.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No data available for this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Least Popular Items */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Least Popular Items</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity Sold
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {menuItemsData.leastPopular && menuItemsData.leastPopular.length > 0 ? (
                      menuItemsData.leastPopular.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.totalQuantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.totalRevenue.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.averagePrice.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No data available for this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Pagination Controls */}
          {menuItemsData.pagination && menuItemsData.pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Showing page {menuItemsData.pagination.page} of {menuItemsData.pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className={`px-4 py-2 rounded ${
                    page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={page === menuItemsData.pagination.totalPages}
                  className={`px-4 py-2 rounded ${
                    page === menuItemsData.pagination.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p>No menu items data available for the selected period.</p>
        </div>
      )}
    </div>
  );
};

export default MenuItemsAnalyticsPage; 