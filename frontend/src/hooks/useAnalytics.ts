import { useState, useEffect, useCallback, useRef } from 'react';
import analyticsService, { 
  SalesAnalytics, 
  MenuItemsAnalytics, 
  CustomerAnalytics,
  InventoryAnalytics,
  FeedbackAnalytics 
} from '../services/analyticsService';
import { format, subDays, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns';
import { toast } from 'react-toastify';

// Common date range type used across analytics components
export interface DateRange {
  startDate: string;
  endDate: string;
}

// Enhanced error type with more specific information
export interface AnalyticsError {
  message: string;
  type: 'TIMEOUT_ERROR' | 'AUTH_ERROR' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'DATA_ERROR' | 'UNKNOWN_ERROR';
  response?: any;
  retry?: boolean;
  reduceDateRangeRecommended?: boolean;
}

// Cache management
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

// Cache utility for analytics data
const analyticsCache = {
  entries: new Map<string, CacheEntry<any>>(),
  
  // Generate cache key from parameters
  generateKey: (endpoint: string, params: Record<string, any>): string => {
    const sortedParams = Object.entries(params)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `${endpoint}?${sortedParams}`;
  },
  
  // Get data from cache if it exists and is not stale
  get: <T>(key: string, maxAge: number = 5 * 60 * 1000): T | null => {
    const entry = analyticsCache.entries.get(key);
    if (!entry) return null;
    
    const isStale = Date.now() - entry.timestamp > maxAge;
    return isStale ? null : entry.data;
  },
  
  // Set data in cache
  set: <T>(key: string, data: T): void => {
    analyticsCache.entries.set(key, {
      data,
      timestamp: Date.now(),
      key
    });
  },
  
  // Clear specific cache entry
  clear: (key: string): void => {
    analyticsCache.entries.delete(key);
  },
  
  // Clear all cache entries
  clearAll: (): void => {
    analyticsCache.entries.clear();
  }
};

// Date validation utility
const isValidDateString = (dateString: string): boolean => {
  if (!dateString) return false;
  
  // Try to parse the date string
  const date = parseISO(dateString);
  return isValid(date);
};

// Default date ranges
export const dateRangePresets = {
  lastWeek: (): DateRange => {
    const end = new Date();
    const start = subDays(end, 7);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    };
  },
  
  lastMonth: (): DateRange => {
    const end = new Date();
    const start = subDays(end, 30);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    };
  },
  
  thisMonth: (): DateRange => {
    const today = new Date();
    return {
      startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(today), 'yyyy-MM-dd')
    };
  },
  
  lastThreeMonths: (): DateRange => {
    const end = new Date();
    const start = subDays(end, 90);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    };
  }
};

// Normalized error handler
const normalizeError = (err: any): AnalyticsError => {
  let errorMessage = 'Failed to load analytics data.';
  let errorType: AnalyticsError['type'] = 'UNKNOWN_ERROR';
  let retry = true;
  let reduceDateRangeRecommended = false;
  
  if (err.response) {
    // Handle specific error types based on response status
    if (err.response.status === 504) {
      errorMessage = 'Database query timed out. Please try again or consider filtering your data.';
      errorType = 'TIMEOUT_ERROR';
      reduceDateRangeRecommended = true;
    } else if (err.response.status === 401 || err.response.status === 403) {
      errorMessage = 'You are not authorized to view this data.';
      errorType = 'AUTH_ERROR';
      retry = false;
    } else if (err.response.status >= 500) {
      errorMessage = 'Server error occurred. Our team has been notified.';
      errorType = 'SERVER_ERROR';
    } else if (err.response.status === 422) {
      errorMessage = 'Invalid data provided. Please check your inputs.';
      errorType = 'DATA_ERROR';
    }
    
    // Use server provided error message if available
    if (err.response.data && err.response.data.message) {
      errorMessage = err.response.data.message;
    }
    
    // Use server provided error type if available
    if (err.response.data && err.response.data.error) {
      if (
        err.response.data.error === 'TIMEOUT_ERROR' ||
        err.response.data.error === 'AUTH_ERROR' ||
        err.response.data.error === 'SERVER_ERROR' ||
        err.response.data.error === 'NETWORK_ERROR' ||
        err.response.data.error === 'DATA_ERROR'
      ) {
        errorType = err.response.data.error;
      }
      
      if (err.response.data.error === 'MEMORY_LIMIT_EXCEEDED') {
        errorType = 'SERVER_ERROR';
        errorMessage = 'Server ran out of memory processing this request. Please try a smaller date range.';
        reduceDateRangeRecommended = true;
      }
    }
  } else if (err.request) {
    // No response received
    errorMessage = 'Could not connect to the server. Check your internet connection.';
    errorType = 'NETWORK_ERROR';
  }
  
  return { 
    message: errorMessage, 
    type: errorType, 
    response: err.response,
    retry,
    reduceDateRangeRecommended
  };
};

/**
 * Generic hook for handling analytics data fetching with common functionality
 * 
 * @template T The type of analytics data to be fetched
 * @param fetchFunction The function to fetch the data
 * @param options Configuration options for the hook
 * @returns Object containing data, loading state, error state, and utility functions
 */
export function useAnalytics<T>(
  fetchFunction: (startDate: string, endDate: string, ...args: any[]) => Promise<T>,
  options: {
    initialDateRange?: DateRange;
    enableCache?: boolean;
    cacheMaxAge?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: AnalyticsError) => void;
    validateDateRange?: boolean;
  } = {}
) {
  // Default options
  const {
    initialDateRange = dateRangePresets.lastMonth(),
    enableCache = true,
    cacheMaxAge = 5 * 60 * 1000, // 5 minutes
    onSuccess,
    onError,
    validateDateRange = true
  } = options;
  
  // Data and loading states
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AnalyticsError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMountedRef = useRef(true);
  
  // Date range state with defaults
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  
  // Function to validate date range
  const validateDates = useCallback((): boolean => {
    if (!validateDateRange) return true;
    
    const isStartValid = isValidDateString(dateRange.startDate);
    const isEndValid = isValidDateString(dateRange.endDate);
    
    if (!isStartValid || !isEndValid) {
      setError({
        message: `Invalid date format: ${!isStartValid ? 'Start date' : 'End date'} is not valid.`,
        type: 'DATA_ERROR',
        retry: false
      });
      return false;
    }
    
    // Check if start date is after end date
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    if (start > end) {
      setError({
        message: 'Start date cannot be after end date.',
        type: 'DATA_ERROR',
        retry: false
      });
      return false;
    }
    
    return true;
  }, [dateRange, validateDateRange]);
  
  // Generate cache key for current request
  const getCacheKey = useCallback(() => {
    if (!enableCache) return null;
    
    const endpoint = fetchFunction.name || 'analytics';
    return analyticsCache.generateKey(endpoint, {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      retryCount
    });
  }, [fetchFunction, dateRange, retryCount, enableCache]);
  
  // Fetch data function that handles common patterns
  const fetchData = useCallback(async () => {
    if (!validateDates()) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first if enabled
      const cacheKey = getCacheKey();
      if (enableCache && cacheKey) {
        const cachedData = analyticsCache.get<T>(cacheKey, cacheMaxAge);
        if (cachedData) {
          setData(cachedData);
          setIsLoading(false);
          onSuccess?.(cachedData);
          return;
        }
      }
      
      // Add a small delay if this is a retry to prevent hammering the server
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Call the fetch function with the date range
      const result = await fetchFunction(dateRange.startDate, dateRange.endDate);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setData(result);
        
        // Cache the result if caching is enabled
        if (enableCache && cacheKey) {
          analyticsCache.set<T>(cacheKey, result);
        }
        
        // Call success callback if provided
        onSuccess?.(result);
      }
    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      
      const normalizedError = normalizeError(err);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setError(normalizedError);
        
        // Call error callback if provided
        onError?.(normalizedError);
        
        // Show toast notification for critical errors
        if (normalizedError.type === 'SERVER_ERROR' || normalizedError.type === 'AUTH_ERROR') {
          toast.error(normalizedError.message);
        }
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFunction, dateRange, retryCount, validateDates, getCacheKey, enableCache, cacheMaxAge, onSuccess, onError]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  // Handle component initialization
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle retry
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  // Date range utility functions
  const handleDateChange = useCallback((newDateRange: Partial<DateRange>) => {
    setDateRange(prev => ({ ...prev, ...newDateRange }));
  }, []);

  // Preset date range utilities
  const setLastWeek = useCallback(() => {
    setDateRange(dateRangePresets.lastWeek());
  }, []);
  
  const setLastMonth = useCallback(() => {
    setDateRange(dateRangePresets.lastMonth());
  }, []);
  
  const setThisMonth = useCallback(() => {
    setDateRange(dateRangePresets.thisMonth());
  }, []);

  // Reduce date range (for timeout errors)
  const handleReduceDateRange = useCallback(() => {
    setDateRange(dateRangePresets.lastMonth());
    // Force a new retry after reducing date range
    setRetryCount(prev => prev + 1);
  }, []);

  // Invalidate cache and refetch
  const invalidateCache = useCallback(() => {
    const cacheKey = getCacheKey();
    if (cacheKey) {
      analyticsCache.clear(cacheKey);
    }
    setRetryCount(prev => prev + 1);
  }, [getCacheKey]);

  return {
    data,
    isLoading,
    error,
    dateRange,
    handleDateChange,
    handleRetry,
    handleReduceDateRange,
    setLastWeek,
    setLastMonth,
    setThisMonth,
    refetch: fetchData,
    invalidateCache
  };
}

// Currency formatting utility
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }
  return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Format percentage
export const formatPercentage = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  return value.toFixed(decimals) + '%';
};

// Format number with thousands separators
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
};

// Specialized hooks for specific analytics endpoints
export function useSalesAnalytics(options: {
  initialDateRange?: DateRange;
  period?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  page?: number;
  limit?: number;
  onSuccess?: (data: SalesAnalytics) => void;
  onError?: (error: AnalyticsError) => void;
} = {}) {
  const { 
    initialDateRange,
    period = 'daily', 
    page = 1, 
    limit = 10,
    onSuccess,
    onError
  } = options;
  
  // Using the correctly typed function from analytics service
  const fetchSalesData = useCallback(async (startDate: string, endDate: string) => {
    return analyticsService.getSalesAnalytics(startDate, endDate, period, page, limit);
  }, [period, page, limit]);
  
  return useAnalytics<SalesAnalytics>(fetchSalesData, {
    initialDateRange,
    onSuccess,
    onError
  });
}

export function useMenuItemsAnalytics(options: {
  initialDateRange?: DateRange;
  page?: number;
  limit?: number;
  onSuccess?: (data: MenuItemsAnalytics) => void;
  onError?: (error: AnalyticsError) => void;
} = {}) {
  const {
    initialDateRange,
    page = 1,
    limit = 5,
    onSuccess,
    onError
  } = options;
  
  const fetchMenuItemsData = useCallback(async (startDate: string, endDate: string) => {
    return analyticsService.getMenuItemsAnalytics(startDate, endDate, page, limit);
  }, [page, limit]);
  
  return useAnalytics<MenuItemsAnalytics>(fetchMenuItemsData, {
    initialDateRange,
    onSuccess,
    onError
  });
}

export function useCustomerAnalytics(options: {
  initialDateRange?: DateRange;
  onSuccess?: (data: CustomerAnalytics) => void;
  onError?: (error: AnalyticsError) => void;
} = {}) {
  const { initialDateRange, onSuccess, onError } = options;
  
  const fetchCustomerData = useCallback(async (startDate: string, endDate: string) => {
    return analyticsService.getCustomerAnalytics(startDate, endDate);
  }, []);
  
  return useAnalytics<CustomerAnalytics>(fetchCustomerData, {
    initialDateRange,
    onSuccess,
    onError
  });
}

export function useFeedbackAnalytics(options: {
  initialDateRange?: DateRange;
  onSuccess?: (data: FeedbackAnalytics) => void;
  onError?: (error: AnalyticsError) => void;
} = {}) {
  const { initialDateRange, onSuccess, onError } = options;
  
  // Using the correctly typed function
  const fetchFeedbackData = useCallback(async (startDate: string, endDate: string) => {
    return analyticsService.getFeedbackAnalytics(startDate, endDate);
  }, []);
  
  return useAnalytics<FeedbackAnalytics>(fetchFeedbackData, {
    initialDateRange,
    onSuccess,
    onError
  });
}

// For inventory analytics, which doesn't use date ranges
export function useInventoryAnalytics(options: {
  onSuccess?: (data: InventoryAnalytics) => void;
  onError?: (error: AnalyticsError) => void;
  enableCache?: boolean;
} = {}) {
  const { onSuccess, onError, enableCache = true } = options;
  const [data, setData] = useState<InventoryAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AnalyticsError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMountedRef = useRef(true);

  const cacheKey = 'inventoryAnalytics';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first if enabled
      if (enableCache) {
        const cachedData = analyticsCache.get<InventoryAnalytics>(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setIsLoading(false);
          onSuccess?.(cachedData);
          return;
        }
      }
      
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const result = await analyticsService.getInventoryAnalytics();
      
      if (isMountedRef.current) {
        setData(result);
        
        // Cache the result
        if (enableCache) {
          analyticsCache.set<InventoryAnalytics>(cacheKey, result);
        }
        
        onSuccess?.(result);
      }
    } catch (err: any) {
      console.error('Error fetching inventory analytics:', err);
      
      const normalizedError = normalizeError(err);
      
      if (isMountedRef.current) {
        setError(normalizedError);
        onError?.(normalizedError);
        
        if (normalizedError.type === 'SERVER_ERROR' || normalizedError.type === 'AUTH_ERROR') {
          toast.error(normalizedError.message);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [retryCount, enableCache, onSuccess, onError]);

  useEffect(() => {
    fetchData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  const invalidateCache = useCallback(() => {
    if (enableCache) {
      analyticsCache.clear(cacheKey);
    }
    setRetryCount(prev => prev + 1);
  }, [enableCache]);

  return {
    data,
    isLoading,
    error,
    handleRetry,
    refetch: fetchData,
    invalidateCache
  };
} 