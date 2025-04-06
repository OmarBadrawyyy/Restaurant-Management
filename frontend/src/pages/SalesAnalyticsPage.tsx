import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import analyticsService, { SalesAnalytics } from '../services/analyticsService';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

// Define a custom formatCurrency function since the formatters module is missing
const formatCurrency = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }
  return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Define a type for the day data that handles both formats
type SalesDay = {
  date: string;
  totalSales?: number;
  total?: number;
  orderCount?: number;
  orders?: number;
  averageOrderValue?: number;
  period?: any;
};

// Implement a simple chart using SVG
const LineChart: React.FC<{data: SalesDay[]}> = ({data}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 h-64 flex items-center justify-center">
        <p className="text-gray-500">No sales data available for charting.</p>
      </div>
    );
  }
  
  // Sort data by date
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Extract values for the chart
  const values = sortedData.map(item => Number(item.totalSales || item.total || 0));
  const dates = sortedData.map(item => format(new Date(item.date), 'MMM d'));
  
  // Calculate chart dimensions
  const chartWidth = 800;
  const chartHeight = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 60 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;
  
  // Calculate scales
  const maxValue = Math.max(...values);
  const minValue = 0;
  
  // Generate points for the line
  const points = values.map((value, index) => {
    const x = values.length > 1 ? (index / (values.length - 1)) * graphWidth : graphWidth / 2;
    const y = graphHeight - ((value - minValue) / (maxValue - minValue || 1)) * graphHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
        {/* Y axis */}
        <line 
          x1={padding.left} 
          y1={padding.top} 
          x2={padding.left} 
          y2={padding.top + graphHeight} 
          stroke="#e2e8f0" 
          strokeWidth="1"
        />
        
        {/* X axis */}
        <line 
          x1={padding.left} 
          y1={padding.top + graphHeight} 
          x2={padding.left + graphWidth} 
          y2={padding.top + graphHeight} 
          stroke="#e2e8f0" 
          strokeWidth="1"
        />
        
        {/* Y-axis labels - show 5 tick marks */}
        {[0, 1, 2, 3, 4].map(tick => {
          const value = minValue + (maxValue - minValue) * (4 - tick) / 4;
          const y = padding.top + (tick * graphHeight / 4);
          return (
            <g key={`y-${tick}`}>
              <line 
                x1={padding.left - 5} 
                y1={y} 
                x2={padding.left} 
                y2={y} 
                stroke="#cbd5e0" 
                strokeWidth="1"
              />
              <text 
                x={padding.left - 10} 
                y={y + 5} 
                textAnchor="end" 
                fontSize="10" 
                fill="#64748b"
              >
                ${value.toFixed(0)}
              </text>
            </g>
          );
        })}
        
        {/* X-axis labels - show labels for first, middle and last */}
        {dates.length > 0 && (
          <>
            <text 
              x={padding.left} 
              y={padding.top + graphHeight + 20} 
              fontSize="10" 
              fill="#64748b"
            >
              {dates[0]}
            </text>
            {dates.length > 2 && (
              <text 
                x={padding.left + graphWidth/2} 
                y={padding.top + graphHeight + 20} 
                fontSize="10" 
                textAnchor="middle" 
                fill="#64748b"
              >
                {dates[Math.floor(dates.length/2)]}
              </text>
            )}
            <text 
              x={padding.left + graphWidth} 
              y={padding.top + graphHeight + 20} 
              fontSize="10" 
              textAnchor="end" 
              fill="#64748b"
            >
              {dates[dates.length-1]}
            </text>
          </>
        )}
        
        {/* Chart area */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Data line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={points}
          />
          
          {/* Data points */}
          {values.map((value, index) => {
            const x = values.length > 1 ? (index / (values.length - 1)) * graphWidth : graphWidth / 2;
            const y = graphHeight - ((value - minValue) / (maxValue - minValue || 1)) * graphHeight;
            return (
              <circle
                key={`point-${index}`}
                cx={x}
                cy={y}
                r="3"
                fill="#3b82f6"
              />
            );
          })}
          
          {/* Area under the curve */}
          <path
            d={`M0,${graphHeight} ${points} ${graphWidth},${graphHeight} Z`}
            fill="rgba(59, 130, 246, 0.1)"
          />
        </g>
      </svg>
      <div className="text-center text-sm text-gray-500 mt-2">
        Sales trend for selected period (based on {values.length} data points)
      </div>
    </div>
  );
};

const ErrorDisplay: React.FC<{ 
  error: any; 
  onRetry: () => void;
  onReduceDateRange?: () => void;
}> = ({ error, onRetry, onReduceDateRange }) => {
  // Determine if this is a timeout error
  const isTimeout = error?.response?.status === 504 || 
                   (error?.response?.data?.error === 'TIMEOUT_ERROR');
  
  const isMemoryError = error?.response?.data?.error === 'MEMORY_LIMIT_EXCEEDED';
  
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow" role="alert">
      <h3 className="font-bold text-lg mb-2">Error Loading Data</h3>
      <p className="mb-3">{error?.response?.data?.message || error?.message || 'Failed to load sales data.'}</p>
      
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Try Again
        </button>
        
        {(isTimeout || isMemoryError) && onReduceDateRange && (
          <button 
            onClick={onReduceDateRange}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Use Smaller Date Range
          </button>
        )}
      </div>
      
      {(isTimeout || isMemoryError) && (
        <p className="text-sm mt-3 text-red-600">
          Tip: For better performance, try selecting a shorter date range or a different grouping option.
        </p>
      )}
    </div>
  );
};

const SalesAnalyticsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [salesData, setSalesData] = useState<SalesAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  
  // Period options
  const [period, setPeriod] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await analyticsService.getSalesAnalytics(
          dateRange.startDate,
          dateRange.endDate,
          period,
          page,
          limit
        );
        
        setSalesData(data);
      } catch (err: any) {
        console.error('Error fetching sales analytics:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();
  }, [dateRange.startDate, dateRange.endDate, period, page, limit, retryCount]);

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
  
  // Set predefined date ranges
  const setLastWeek = () => {
    const end = new Date();
    const start = subDays(end, 7);
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
    setPeriod('daily'); // Best performance for short ranges
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
  
  // Handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };
  
  // Handle reducing date range
  const handleReduceDateRange = () => {
    // Calculate a smaller date range (last 7 days)
    const end = new Date();
    const start = subDays(end, 7);
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
    setPeriod('daily'); // Switch to daily for better performance
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You don't have permission to access the sales analytics.</p>
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
          <h1 className="text-3xl font-bold text-gray-800">Sales Analytics</h1>
          <p className="text-gray-600">Analyze sales performance over time</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'hourly' | 'daily' | 'weekly' | 'monthly')}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
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
      </div>
      
      {isLoading ? (
        <LoadingSpinner message="Loading sales data..." />
      ) : error ? (
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          onReduceDateRange={handleReduceDateRange}
        />
      ) : salesData ? (
        <>
          {/* Sales Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Sales</h2>
              <p className="text-3xl font-bold">{formatCurrency(salesData.summary.totalSales)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {format(new Date(salesData.period.start), 'MMM d, yyyy')} - {format(new Date(salesData.period.end), 'MMM d, yyyy')}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Orders</h2>
              <p className="text-3xl font-bold">{salesData.summary.totalOrders}</p>
              <p className="text-sm text-gray-500 mt-1">
                For selected period
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Average Order Value</h2>
              <p className="text-3xl font-bold">{formatCurrency(salesData.summary.averageOrderValue)}</p>
              <p className="text-sm text-gray-500 mt-1">
                Per order
              </p>
            </div>
          </div>
          
          {/* Sales Chart */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Sales Trend</h2>
            <LineChart data={salesData.data || salesData.dailySales || []} />
          </div>
          
          {/* Sales Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <h2 className="text-xl font-semibold text-gray-700 p-4 border-b">Sales by Day</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(salesData.data || salesData.dailySales || []).map((day: SalesDay, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {format(new Date(day.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {day.orderCount || day.orders || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(day.totalSales || day.total || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(day.averageOrderValue || (day.orders && day.total ? (day.total / day.orders) : 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {salesData.pagination && salesData.pagination.totalPages > 1 && (
              <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className={`px-4 py-2 border rounded-md text-sm font-medium ${
                      page === 1
                        ? 'border-gray-300 bg-white text-gray-300 cursor-not-allowed'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(salesData.pagination?.totalPages || 1, page + 1))}
                    disabled={page === (salesData.pagination?.totalPages || 1)}
                    className={`ml-3 px-4 py-2 border rounded-md text-sm font-medium ${
                      page === (salesData.pagination?.totalPages || 1)
                        ? 'border-gray-300 bg-white text-gray-300 cursor-not-allowed'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(page * limit, salesData.pagination?.totalItems || 0)}
                      </span>{' '}
                      of <span className="font-medium">{salesData.pagination?.totalItems || 0}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className={`px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          page === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {/* Page numbers */}
                      {[...Array(Math.min(5, salesData.pagination?.totalPages || 1))].map((_, i) => {
                        const pageNum = i + 1;
                        const isCurrent = pageNum === page;
                        return (
                          <button
                            key={i}
                            onClick={() => setPage(pageNum)}
                            className={`px-4 py-2 border ${
                              isCurrent
                                ? 'bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            } text-sm font-medium`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setPage(Math.min(salesData.pagination?.totalPages || 1, page + 1))}
                        disabled={page === (salesData.pagination?.totalPages || 1)}
                        className={`px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          page === (salesData.pagination?.totalPages || 1)
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p>No sales data available for the selected period.</p>
        </div>
      )}
    </div>
  );
};

export default SalesAnalyticsPage; 