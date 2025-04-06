import axios, { AxiosRequestConfig } from 'axios';

// Define custom properties for AxiosRequestConfig
interface CustomRequestConfig extends AxiosRequestConfig {
  _optimized?: boolean;
  _originalParams?: any;
  _autoReduced?: boolean;
  _retryCount?: number;
  _retry?: boolean;
}

// Define analytics service endpoints
const ANALYTICS_URL = '/api/analytics';

// Get CSRF token from cookies
const getCsrfToken = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN') {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Helper function to add CSRF token to request config
const addCsrfToken = (config: any = {}) => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers = {
      ...config.headers,
      'X-CSRF-Token': csrfToken
    };
  }
  return config;
};

// Create a custom axios instance for analytics to handle specific requirements
const analyticsAxios = axios.create({
  timeout: 30000 // 30 second timeout for analytics requests
});

// Add request interceptor for sales analytics to auto-apply smaller date ranges
analyticsAxios.interceptors.request.use(
  async (config) => {
    // Apply to both menu-items and sales endpoints
    if (config.url?.includes('/menu-items') || config.url?.includes('/sales')) {
      // Add a flag to track if this is an optimized request
      config.params = config.params || {};
      
      // Cast to our custom interface to access the properties
      const customConfig = config as CustomRequestConfig;
      
      // Check if this is a retry or already optimized
      if (!customConfig._optimized) {
        // Save original params for potential retry
        customConfig._originalParams = { ...config.params };
        
        // If date range is too large, automatically reduce it
        if (config.params.startDate && config.params.endDate) {
          const start = new Date(config.params.startDate);
          const end = new Date(config.params.endDate);
          const rangeInDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          
          // For sales analytics
          if (config.url?.includes('/sales')) {
            // If range is more than a month, automatically reduce to 30 days
            if (rangeInDays > 30) {
              const newEnd = new Date(start);
              newEnd.setDate(start.getDate() + 30);
              config.params.endDate = newEnd.toISOString().split('T')[0];
              customConfig._autoReduced = true;
              console.info(`Automatically reduced date range to 30 days for sales performance: ${config.params.startDate} to ${config.params.endDate}`);
            }
            
            // If using hourly grouping with more than 7 days, switch to daily
            if (config.params.period === 'hourly' && rangeInDays > 7) {
              config.params.period = 'daily';
              console.info(`Automatically switched from hourly to daily grouping for better performance`);
            }
          }
          // For menu items analytics (existing logic)
          else if (config.url?.includes('/menu-items') && rangeInDays > 7) {
            const newEnd = new Date(start);
            newEnd.setDate(start.getDate() + 5);
            config.params.endDate = newEnd.toISOString().split('T')[0];
            customConfig._autoReduced = true;
            console.info(`Automatically reduced date range to 5 days for performance: ${config.params.startDate} to ${config.params.endDate}`);
          }
        }
        
        // Ensure pagination is reasonable
        if (config.params.limit && parseInt(config.params.limit) > 10) {
          config.params.limit = 10;
          console.info(`Automatically reduced limit to 10 for performance`);
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for retrying failed requests
analyticsAxios.interceptors.response.use(
  response => response,
  async (error) => {
    const { config, response } = error;
    
    // Only retry GET requests that time out or have server errors
    if (
      !config || 
      !config.method || 
      config.method.toLowerCase() !== 'get' || 
      config._retry ||
      !response ||
      (response.status < 500 && response.status !== 429 && error.code !== 'ECONNABORTED')
    ) {
      return Promise.reject(error);
    }
    
    // Mark as retry attempt
    config._retry = true;
    
    // Add exponential backoff delay (500ms, 1s, 2s, etc.)
    const retries = config._retryCount || 0;
    config._retryCount = retries + 1;
    
    if (retries >= 3) {
      return Promise.reject(error);
    }
    
    const delay = Math.pow(2, retries) * 500; // Exponential backoff
    
    // Wait before retrying
    return new Promise(resolve => {
      console.log(`Retrying request (${retries + 1}/3) after ${delay}ms delay...`);
      setTimeout(() => {
        resolve(analyticsAxios(config));
      }, delay);
    });
  }
);

// Types for analytics data
export interface SalesAnalytics {
  period: {
    start: string;
    end: string;
    groupBy?: string;
  };
  summary: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  };
  dailySales?: {
    date: string;
    total: number;
    orders: number;
  }[];
  data?: {
    date: string;
    totalSales: number;
    orderCount: number;
    averageOrderValue: number;
    period?: any;
  }[];
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  paymentMethods?: {
    method: string;
    count: number;
    total: number;
  }[];
}

export interface MenuItemsAnalytics {
  period: {
    start: string;
    end: string;
  };
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  mostPopular: {
    _id: string;
    name: string;
    category: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
    averagePrice: number;
  }[];
  leastPopular: {
    _id: string;
    name: string;
    category: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
    averagePrice: number;
  }[];
  _reducedDateRange?: boolean;
  _originalEndDate?: string;
}

export interface CustomerAnalytics {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    retentionRate: number;
  };
  topCustomers: {
    _id: string;
    name: string;
    email: string;
    totalSpent: number;
    orderCount: number;
    averageOrderValue: number;
  }[];
}

export interface InventoryAnalytics {
  summary: {
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    reorderCount: number;
  };
  lowStockItems: {
    _id: string;
    name: string;
    currentStock: number;
    minStockLevel: number;
    reorderPoint: number;
    costPerUnit: number;
  }[];
  reorderItems: {
    _id: string;
    name: string;
    currentStock: number;
    minStockLevel: number;
    reorderPoint: number;
    costPerUnit: number;
  }[];
  valueByCategory: {
    _id: string;
    totalItems: number;
    totalValue: number;
    averageValue: number;
  }[];
}

export interface FeedbackAnalytics {
  period: {
    start: string;
    end: string;
  };
  summary: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
      fiveStar: number;
      fourStar: number;
      threeStar: number;
      twoStar: number;
      oneStar: number;
    };
  };
  sentimentBreakdown: {
    positive?: number;
    neutral?: number;
    negative?: number;
  };
  categoryRatings: {
    food: number;
    service: number;
    ambience: number;
    cleanliness: number;
    value: number;
  };
  commonTags: {
    _id: string;
    count: number;
  }[];
}

export interface DashboardAnalytics {
  timestamp: string;
  sales: {
    today: {
      total: number;
      count: number;
    };
    yesterday: {
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
  operations: {
    pendingOrders: number;
    todayReservations: number;
    lowStockItems: number;
  };
  systemStats: {
    totalUsers: number;
    totalCustomers: number;
    totalStaff: number;
    newUsersToday: number;
  };
  recentFeedback: any[];
}

// Get sales analytics with retry logic
const getSalesAnalytics = async (
  startDate: string,
  endDate: string,
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' = 'daily',
  page: number = 1,
  limit: number = 10
): Promise<SalesAnalytics> => {
  try {
    const config = addCsrfToken({
      params: {
        startDate,
        endDate,
        period,
        page,
        limit
      },
      withCredentials: true
    });
    
    const response = await analyticsAxios.get(`${ANALYTICS_URL}/sales`, config);
    return response.data;
  } catch (error: any) {
    // Add special retry logic for timeout errors
    if (error.response && error.response.status === 504) {
      console.warn('Sales analytics query timed out, retrying with optimized request...');
      
      let optimizedConfig: any = {
        params: {
          startDate,
          endDate,
          period,
          page,
          limit,
          _optimized: true
        },
        withCredentials: true
      };
      
      // Strategy 1: Reduce date range if it's large
      const start = new Date(startDate);
      const end = new Date(endDate);
      const rangeInDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      // Last resort - try with reduced time range or grouping
      if (rangeInDays > 30) {
        // Shrink to 30 days
        const newEnd = new Date(start);
        newEnd.setDate(start.getDate() + 30);
        optimizedConfig.params.endDate = newEnd.toISOString().split('T')[0];
        console.info(`Retrying with reduced range: ${startDate} to ${optimizedConfig.params.endDate}`);
      } else if (period === 'hourly' && rangeInDays > 7) {
        // Switch from hourly to daily for large ranges
        optimizedConfig.params.period = 'daily';
        console.info(`Switching from hourly to daily grouping for better performance`);
      }
      
      try {
        const retryResponse = await analyticsAxios.get(`${ANALYTICS_URL}/sales`, addCsrfToken(optimizedConfig));
        return retryResponse.data;
      } catch (retryError) {
        console.error('Error on retry of sales analytics:', retryError);
        throw retryError;
      }
    }
    
    console.error('Error fetching sales analytics:', error);
    throw error;
  }
};

// Get menu items analytics
const getMenuItemsAnalytics = async (
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 5
): Promise<MenuItemsAnalytics> => {
  try {
    // Check if the date range is too large (over 30 days) and warn in console
    const startDateTime = new Date(startDate).getTime();
    const endDateTime = new Date(endDate).getTime();
    const daysDiff = Math.floor((endDateTime - startDateTime) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 30) {
      console.warn(`Menu items analytics request with large date range (${daysDiff} days). This may cause performance issues.`);
    }
    
    // Create config with optimization info for tracking
    const config: CustomRequestConfig = {
      params: {
        startDate,
        endDate,
        page,
        limit
      },
      _optimized: false,
      _retryCount: 0
    };
    
    const response = await analyticsAxios.get(`${ANALYTICS_URL}/menu-items`, config);
    
    // Save original response if date range was reduced
    if (response.data._reducedDateRange) {
      return {
        ...response.data,
        _reducedDateRange: true,
        _originalEndDate: endDate
      };
    }
    
    return response.data;
  } catch (error: any) {
    // If this is a timeout, retry with reduced date range
    if (error.response && error.response.status === 504) {
      console.warn('Menu items analytics query timed out. Retrying with optimized parameters.');
      
      // Calculate reduced date range (reduce to 7 days)
      let optimizedEndDate = endDate;
      const startDateTime = new Date(startDate).getTime();
      const endDateTime = new Date(endDate).getTime();
      const daysDiff = Math.floor((endDateTime - startDateTime) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 7) {
        // Reduce to 7 days from start date
        const newEndDate = new Date(startDateTime + (7 * 24 * 60 * 60 * 1000));
        optimizedEndDate = newEndDate.toISOString().split('T')[0];
      }
      
      // Retry with reduced parameters
      return getMenuItemsAnalytics(
        startDate,
        optimizedEndDate,
        page,
        limit
      );
    }
    
    throw error;
  }
};

// Get customer analytics
const getCustomerAnalytics = async (
  startDate: string,
  endDate: string
): Promise<CustomerAnalytics> => {
  try {
    // Check if the date range is too large (over 90 days) and warn in console
    const startDateTime = new Date(startDate).getTime();
    const endDateTime = new Date(endDate).getTime();
    const daysDiff = Math.floor((endDateTime - startDateTime) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 90) {
      console.warn(`Customer analytics request with large date range (${daysDiff} days). This may cause performance issues.`);
    }
    
    // Create config with optimization info for tracking
    const config: CustomRequestConfig = {
      params: {
        startDate,
        endDate
      },
      _optimized: false,
      _retryCount: 0
    };
    
    const response = await analyticsAxios.get(`${ANALYTICS_URL}/customers`, config);
    return response.data;
  } catch (error: any) {
    // Add special retry logic for timeout errors
    if (error.response && error.response.status === 504) {
      console.warn('Customer analytics query timed out. Retrying with optimized parameters...');
      
      // Calculate a reduced date range (reduce to 30 days)
      let optimizedEndDate = endDate;
      const startDateTime = new Date(startDate).getTime();
      const endDateTime = new Date(endDate).getTime();
      const daysDiff = Math.floor((endDateTime - startDateTime) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 30) {
        // Reduce to 30 days from start date
        const newEndDate = new Date(startDateTime + (30 * 24 * 60 * 60 * 1000));
        optimizedEndDate = newEndDate.toISOString().split('T')[0];
      }
      
      // Retry with reduced parameters
      try {
        const retryConfig: CustomRequestConfig = {
          params: {
            startDate,
            endDate: optimizedEndDate
          },
          _optimized: true
        };
        
        const retryResponse = await analyticsAxios.get(`${ANALYTICS_URL}/customers`, retryConfig);
        
        return retryResponse.data;
      } catch (retryError) {
        console.error('Error on retry of customer analytics:', retryError);
        throw retryError;
      }
    }
    
    throw error;
  }
};

// Get inventory analytics
const getInventoryAnalytics = async (): Promise<InventoryAnalytics> => {
  try {
    const config = addCsrfToken({ withCredentials: true });
    const response = await analyticsAxios.get(`${ANALYTICS_URL}/inventory`, config);
    return response.data;
  } catch (error: any) {
    // Add special retry logic for timeout errors
    if (error.response && error.response.status === 504) {
      console.warn('Inventory analytics query timed out, retrying with optimized request...');
      
      // Try again with optimized request
      const retryConfig = addCsrfToken({
        params: {
          _optimized: true
        },
        _optimized: true, // Mark as already optimized
        withCredentials: true
      } as CustomRequestConfig);
      
      try {
        console.info(`Retrying inventory analytics with optimized request`);
        const retryResponse = await analyticsAxios.get(`${ANALYTICS_URL}/inventory`, retryConfig);
        return retryResponse.data;
      } catch (retryError) {
        console.error('Error on retry of inventory analytics:', retryError);
        throw retryError;
      }
    }
    
    console.error('Error fetching inventory analytics:', error);
    throw error;
  }
};

// Get feedback analytics
const getFeedbackAnalytics = async (
  startDate: string,
  endDate: string
): Promise<FeedbackAnalytics> => {
  try {
    // Create optimized config with retry tracking
    const config: CustomRequestConfig = addCsrfToken({
      params: {
        startDate,
        endDate
      },
      withCredentials: true,
      _retryCount: 0  // Initialize retry count
    });
    
    const response = await analyticsAxios.get(`${ANALYTICS_URL}/feedback`, config);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching feedback analytics:', error);
    
    // Handle timeout errors with retry logic
    if (error.response && error.response.status === 504) {
      const config = error.config as CustomRequestConfig;
      
      // If we haven't retried too many times already
      if (config && (!config._retryCount || config._retryCount < 2)) {
        console.warn('Feedback analytics request timed out, retrying with optimized query...');
        
        // Increment retry count
        config._retryCount = (config._retryCount || 0) + 1;
        config._retry = true;
        
        // Retry the request
        return analyticsAxios.request(config);
      }
    }
    
    throw error;
  }
};

// Get dashboard summary analytics
const getDashboardAnalytics = async (): Promise<DashboardAnalytics> => {
  try {
    const config = addCsrfToken({ withCredentials: true });
    const response = await analyticsAxios.get(`${ANALYTICS_URL}/dashboard`, config);
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    throw error;
  }
};

// Create the service object
const analyticsService = {
  getSalesAnalytics,
  getMenuItemsAnalytics,
  getCustomerAnalytics,
  getInventoryAnalytics,
  getFeedbackAnalytics,
  getDashboardAnalytics
};

// Export the service
export default analyticsService;