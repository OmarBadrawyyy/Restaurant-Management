import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './ui/LoadingSpinner';
import { differenceInDays } from 'date-fns';
import { AnalyticsError, DateRange, formatCurrency, formatNumber, formatPercentage } from '../hooks/useAnalytics';

// Import Recharts components
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell
} from 'recharts';

// Color palettes for charts
export const CHART_COLORS = {
  primary: '#3B82F6', // blue-500
  secondary: '#10B981', // emerald-500
  accent: '#F59E0B', // amber-500
  danger: '#EF4444', // red-500
  neutral: '#6B7280', // gray-500
  pastel: ['#BFDBFE', '#BBF7D0', '#FEF3C7', '#FECACA', '#E5E7EB', '#DDD6FE', '#FBCFE8'],
  vibrant: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#8B5CF6']
};

// Component to display error messages with retry button
export const ErrorDisplay: React.FC<{ 
  error: AnalyticsError; 
  onRetry: () => void;
  onReduceDateRange?: () => void;
}> = ({ error, onRetry, onReduceDateRange }) => {
  // Determine if this is a timeout error
  const isTimeout = error?.response?.status === 504 || 
                   (error.type === 'TIMEOUT_ERROR');
  
  const isMemoryError = error.type === 'SERVER_ERROR' && 
                      error.message.includes('memory');
  
  const isAuthError = error.type === 'AUTH_ERROR';
  
  const isNetworkError = error.type === 'NETWORK_ERROR';
  
  // Icon based on error type
  const errorIcon = () => {
    if (isTimeout || isMemoryError) return '⏱️';
    if (isAuthError) return '🔒';
    if (isNetworkError) return '🌐';
    return '❌';
  };
  
  return (
    <div 
      className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 mb-6 rounded-lg shadow-md" 
      role="alert"
      aria-live="assertive"
      data-testid="analytics-error"
    >
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-3" aria-hidden="true">{errorIcon()}</span>
        <h3 className="font-bold text-lg">Error Loading Data</h3>
      </div>
      
      <p className="mb-4">{error.message || 'Failed to load data.'}</p>
      
      <div className="flex flex-wrap gap-3">
        {error.retry !== false && (
          <button 
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium
                      transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Try loading data again"
          >
            Try Again
          </button>
        )}
        
        {(error.reduceDateRangeRecommended || isTimeout || isMemoryError) && onReduceDateRange && (
          <button 
            onClick={onReduceDateRange}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium
                      transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Use a smaller date range to improve performance"
          >
            Use Smaller Date Range
          </button>
        )}
      </div>
      
      {(isTimeout || isMemoryError) && (
        <p className="text-sm mt-4 p-2 border border-red-200 bg-red-100 rounded text-red-600">
          <strong>Performance Tip:</strong> For better performance, try selecting a shorter date range (30 days or less).
        </p>
      )}
      
      {isNetworkError && (
        <p className="text-sm mt-4 p-2 border border-red-200 bg-red-100 rounded text-red-600">
          <strong>Connection Issue:</strong> Please check your internet connection and try again.
        </p>
      )}
    </div>
  );
};

// Component to display date range warning
export const DateRangeWarning: React.FC<{
  startDate: string;
  endDate: string;
}> = ({ startDate, endDate }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = differenceInDays(end, start);
  
  if (diffDays <= 30) {
    return null;
  }
  
  const severity = diffDays > 90 
    ? 'bg-red-50 border-red-200 text-red-700' 
    : 'bg-yellow-50 border-yellow-200 text-yellow-700';
  
  const icon = diffDays > 90 ? '⚠️' : 'ℹ️';
  
  return (
    <div 
      className={`mt-4 p-3 border rounded-md text-sm ${severity} flex items-center space-x-2`}
      role="status"
      aria-live="polite"
      data-testid="date-range-warning"
    >
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{diffDays > 90 ? 'Warning:' : 'Note:'}</strong> {' '}
        {diffDays > 90 
          ? 'Large date ranges (over 90 days) may result in timeouts and degraded performance.'
          : 'Date ranges over 30 days may affect query performance. Consider using a shorter range for better results.'}
      </div>
    </div>
  );
};

// Date range selector with quick date range options
export const DateRangeSelector: React.FC<{
  dateRange: DateRange;
  onDateChange: (newRange: Partial<DateRange>) => void;
  onSetLastWeek: () => void;
  onSetLastMonth: () => void;
  onSetThisMonth: () => void;
  onSetCustomRange?: (range: DateRange) => void;
  isReadOnly?: boolean;
}> = ({ 
  dateRange, 
  onDateChange, 
  onSetLastWeek, 
  onSetLastMonth, 
  onSetThisMonth,
  onSetCustomRange,
  isReadOnly = false
}) => {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateChange({ startDate: e.target.value });
  };
  
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateChange({ endDate: e.target.value });
  };
  
  return (
    <div 
      className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200"
      data-testid="date-range-selector"
    >
      <h2 className="text-lg font-medium text-gray-800 mb-4">Date Range</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label 
            htmlFor="analytics-start-date" 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Start Date
          </label>
          <input
            id="analytics-start-date"
            type="date"
            value={dateRange.startDate}
            onChange={handleStartDateChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isReadOnly}
            aria-label="Start date for data filtering"
          />
        </div>
        
        <div>
          <label 
            htmlFor="analytics-end-date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            End Date
          </label>
          <input
            id="analytics-end-date"
            type="date"
            value={dateRange.endDate}
            onChange={handleEndDateChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isReadOnly}
            aria-label="End date for data filtering"
          />
        </div>
        
        <div className="flex items-end md:col-span-2 space-x-2">
          <button 
            onClick={onSetLastWeek}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium
                     transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
            disabled={isReadOnly}
            aria-label="Set date range to last 7 days"
          >
            Last 7 Days
          </button>
          <button 
            onClick={onSetLastMonth}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium
                     transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
            disabled={isReadOnly}
            aria-label="Set date range to last 30 days"
          >
            Last 30 Days
          </button>
          <button 
            onClick={onSetThisMonth}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium
                     transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
            disabled={isReadOnly}
            aria-label="Set date range to current month"
          >
            This Month
          </button>
        </div>
      </div>
      
      {/* Date range warnings */}
      <DateRangeWarning startDate={dateRange.startDate} endDate={dateRange.endDate} />
    </div>
  );
};

// Analytics page header with back button
export const AnalyticsHeader: React.FC<{
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
  extraActions?: React.ReactNode;
}> = ({ title, subtitle, showBackButton = true, backTo = "/admin/analytics", extraActions }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-gray-200">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{title}</h1>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>
      
      <div className="flex items-center space-x-2 mt-2 md:mt-0">
        {extraActions}
        
        {showBackButton && (
          <Link 
            to={backTo} 
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center
                     transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Go back to analytics dashboard"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-1" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" 
                clipRule="evenodd" 
              />
            </svg>
            Back
          </Link>
        )}
      </div>
    </div>
  );
};

// Analytics authorization wrapper
export const AnalyticsAuthorization: React.FC<{
  children: React.ReactNode;
  requiredRole?: string;
}> = ({ children, requiredRole = 'admin' }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser || (requiredRole && currentUser.role !== requiredRole)) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50 p-8 rounded-lg shadow-md"
        data-testid="unauthorized-access"
      >
        <div className="text-4xl mb-4" aria-hidden="true">🔒</div>
        <h1 className="text-2xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          You don't have permission to access analytics. Please contact an administrator if you believe this is an error.
        </p>
        <Link 
          to="/" 
          className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700
                   transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Return to Home
        </Link>
      </div>
    );
  }
  
  return <>{children}</>;
};

// Analytics loading state
export const AnalyticsLoading: React.FC<{
  message?: string;
}> = ({ message = "Loading analytics data..." }) => {
  return (
    <div 
      className="flex flex-col items-center justify-center p-8 min-h-[200px]"
      data-testid="analytics-loading"
    >
      <LoadingSpinner size="large" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
};

// Empty state for when no data is available
export const AnalyticsEmptyState: React.FC<{
  onRetry: () => void;
  message?: string;
  suggestion?: string;
}> = ({ onRetry, message = "No data available for the selected period.", suggestion }) => {
  return (
    <div 
      className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 mb-6 rounded-lg shadow-md flex flex-col items-center text-center" 
      role="alert"
      data-testid="analytics-empty-state"
    >
      <div className="text-4xl mb-4" aria-hidden="true">📊</div>
      <h3 className="text-lg font-medium mb-2">No Data Found</h3>
      <p className="mb-4">{message}</p>
      {suggestion && <p className="text-sm mb-4">{suggestion}</p>}
      <button 
        onClick={onRetry}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm
                 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Try Again
      </button>
    </div>
  );
};

// Analytics KPI Card - for displaying summary metrics
export const KpiCard: React.FC<{
  title: string;
  value: string | number;
  previousValue?: string | number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  changePercentage?: number;
  icon?: React.ReactNode;
  tooltip?: string;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'currency' | 'percentage' | 'number';
}> = ({ 
  title, 
  value, 
  previousValue, 
  changeType,
  changePercentage,
  icon,
  tooltip,
  trend,
  format = 'number'
}) => {
  let formattedValue = value;
  let formattedPrevValue = previousValue;
  
  // Format the values based on the format prop
  if (typeof value === 'number') {
    if (format === 'currency') {
      formattedValue = formatCurrency(value);
      if (typeof previousValue === 'number') {
        formattedPrevValue = formatCurrency(previousValue);
      }
    } else if (format === 'percentage') {
      formattedValue = formatPercentage(value);
      if (typeof previousValue === 'number') {
        formattedPrevValue = formatPercentage(previousValue);
      }
    } else if (format === 'number') {
      formattedValue = formatNumber(value);
      if (typeof previousValue === 'number') {
        formattedPrevValue = formatNumber(previousValue);
      }
    }
  }
  
  // Generate trend indicator
  const trendIndicator = () => {
    if (!trend) return null;
    
    let color = 'text-gray-500';
    let icon = null;
    
    if (trend === 'up') {
      color = 'text-green-500';
      icon = (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          viewBox="0 0 20 20" 
          fill="currentColor"
          aria-hidden="true"
        >
          <path 
            fillRule="evenodd" 
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" 
            clipRule="evenodd" 
          />
        </svg>
      );
    } else if (trend === 'down') {
      color = 'text-red-500';
      icon = (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          viewBox="0 0 20 20" 
          fill="currentColor"
          aria-hidden="true"
        >
          <path 
            fillRule="evenodd" 
            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" 
            clipRule="evenodd" 
          />
        </svg>
      );
    }
    
    return (
      <span className={`flex items-center ${color}`}>
        {icon}
        {changePercentage !== undefined && (
          <span className="ml-1">{formatPercentage(changePercentage)}</span>
        )}
      </span>
    );
  };
  
  return (
    <div 
      className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200"
      title={tooltip}
      data-testid="kpi-card"
    >
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      
      <div className="mt-2">
        <div className="text-2xl font-bold text-gray-800">{formattedValue}</div>
        
        {/* Change indicator */}
        {(changePercentage !== undefined || formattedPrevValue || trend) && (
          <div className="mt-2 flex items-center text-sm">
            {formattedPrevValue && (
              <span className="text-gray-500 mr-2">vs. {formattedPrevValue}</span>
            )}
            {trendIndicator()}
          </div>
        )}
      </div>
    </div>
  );
};

// Define simple interfaces for chart data
interface ChartDataPoint {
  [key: string]: any;
}

// Line Chart Component
export const LineChartComponent: React.FC<{
  data: ChartDataPoint[];
  xKey: string;
  yKeys: Array<{dataKey: string, color?: string, name?: string}>;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  loading?: boolean;
  tooltipFormatter?: (value: any) => string;
}> = ({ 
  data, 
  xKey, 
  yKeys, 
  title, 
  xAxisLabel, 
  yAxisLabel, 
  height = 300,
  loading = false,
  tooltipFormatter 
}) => {
  if (loading) {
    return <AnalyticsLoading message="Loading chart data..." />;
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No data available to display chart</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      {title && <h3 className="text-lg font-medium text-gray-800 mb-4">{title}</h3>}
      <div style={{ width: '100%', height: `${height}px` }}>
        <div className="recharts-wrapper">
          {/* This div provides a placeholder for the chart which will be rendered by Recharts */}
          <div 
            className="w-full h-full flex justify-center items-center"
            data-chart="line-chart"
            data-config={JSON.stringify({
              xKey,
              yKeys: yKeys.map(k => k.dataKey),
              xAxisLabel,
              yAxisLabel
            })}
          >
            <p className="text-center text-gray-500">Chart visualization</p>
            {/* The actual chart would be rendered here by Recharts in the browser */}
          </div>
        </div>
      </div>
    </div>
  );
};

// Bar Chart Component
export const BarChartComponent: React.FC<{
  data: ChartDataPoint[];
  xKey: string;
  yKeys: Array<{dataKey: string, color?: string, name?: string, stack?: string}>;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  loading?: boolean;
  layout?: 'horizontal' | 'vertical';
  tooltipFormatter?: (value: any) => string;
}> = ({ 
  data, 
  xKey, 
  yKeys, 
  title, 
  xAxisLabel, 
  yAxisLabel, 
  height = 300,
  loading = false,
  layout = 'vertical',
  tooltipFormatter 
}) => {
  if (loading) {
    return <AnalyticsLoading message="Loading chart data..." />;
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No data available to display chart</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      {title && <h3 className="text-lg font-medium text-gray-800 mb-4">{title}</h3>}
      <div style={{ width: '100%', height: `${height}px` }}>
        <div className="recharts-wrapper">
          {/* This div provides a placeholder for the chart which will be rendered by Recharts */}
          <div 
            className="w-full h-full flex justify-center items-center"
            data-chart="bar-chart"
            data-config={JSON.stringify({
              xKey,
              yKeys: yKeys.map(k => k.dataKey),
              layout,
              xAxisLabel,
              yAxisLabel
            })}
          >
            <p className="text-center text-gray-500">Bar chart visualization</p>
            {/* The actual chart would be rendered here by Recharts in the browser */}
          </div>
        </div>
      </div>
    </div>
  );
};

// Pie Chart Component
export const PieChartComponent: React.FC<{
  data: Array<{name: string, value: number, color?: string}>;
  title?: string;
  height?: number;
  loading?: boolean;
  dataKey?: string;
  nameKey?: string;
  tooltipFormatter?: (value: any) => string;
  colorScheme?: 'pastel' | 'vibrant';
  showLegend?: boolean;
}> = ({ 
  data, 
  title, 
  height = 300,
  loading = false,
  dataKey = 'value',
  nameKey = 'name',
  tooltipFormatter,
  colorScheme = 'vibrant',
  showLegend = true
}) => {
  if (loading) {
    return <AnalyticsLoading message="Loading chart data..." />;
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No data available to display chart</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      {title && <h3 className="text-lg font-medium text-gray-800 mb-4">{title}</h3>}
      <div style={{ width: '100%', height: `${height}px` }}>
        <div className="recharts-wrapper">
          {/* This div provides a placeholder for the chart which will be rendered by Recharts */}
          <div 
            className="w-full h-full flex justify-center items-center"
            data-chart="pie-chart"
            data-config={JSON.stringify({
              dataKey,
              nameKey,
              showLegend,
              colorScheme
            })}
          >
            <p className="text-center text-gray-500">Pie chart visualization</p>
            {/* The actual chart would be rendered here by Recharts in the browser */}
          </div>
        </div>
      </div>
    </div>
  );
};

// Analysis Card - for displaying text-based analysis
export const AnalysisCard: React.FC<{
  title: string;
  insights: string[];
  icon?: React.ReactNode;
  type?: 'info' | 'warning' | 'success' | 'neutral';
}> = ({ title, insights, icon, type = 'neutral' }) => {
  // Color theme based on type
  const theme = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    neutral: 'bg-gray-50 border-gray-200 text-gray-800'
  };
  
  return (
    <div className={`p-4 rounded-lg border ${theme[type]}`}>
      <div className="flex items-center mb-3">
        {icon && <span className="mr-2">{icon}</span>}
        <h3 className="font-medium">{title}</h3>
      </div>
      
      <ul className="space-y-2 pl-5 list-disc">
        {insights.map((insight, index) => (
          <li key={index}>{insight}</li>
        ))}
      </ul>
    </div>
  );
}; 