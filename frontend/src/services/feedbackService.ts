import axios from 'axios';

const API_URL = '/api/feedback';

// Add a function to test the API connection
const testConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing feedback API connection...');
    const response = await axios.get(`${API_URL}/test`, { 
      timeout: 5000 
    });
    console.log('Test response:', response.data);
    return true;
  } catch (error) {
    console.error('Feedback API test failed:', error);
    return false;
  }
};

// Define data types
export interface Feedback {
  _id: string;
  userId: string;
  rating: number;
  comment?: string;
  categoryRatings?: {
    food?: number;
    service?: number;
    ambience?: number;
    cleanliness?: number;
    value?: number;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  hasResponse?: boolean;
  staffResponse?: {
    responder?: string;
    response?: string;
    responseDate?: string;
  };
  isResolved?: boolean;
}

// Response type for standardized API responses
export interface ApiResponse<T = any> {
  status: number;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Helper function to get current CSRF token
const getCsrfToken = (): string => {
  // Try to get it from axios headers first
  const axiosToken = axios.defaults.headers.common['X-CSRF-Token'];
  if (axiosToken) return axiosToken as string;
  
  // Fall back to sessionStorage
  return sessionStorage.getItem('csrf_token') || '';
};

// Handle API errors consistently
const handleApiError = (error: any, context: string): ApiResponse => {
  console.error(`Error in ${context}:`, error);
  
  // Log detailed error information
  if (error.response) {
    console.error('Response data:', error.response.data);
    console.error('Response status:', error.response.status);
    console.error('Response headers:', error.response.headers);
  } else if (error.request) {
    console.error('No response received. Request:', error.request);
  } else {
    console.error('Error setting up request:', error.message);
  }
  
  const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
  return { 
    status: error?.response?.status || 500, 
    error: errorMessage 
  };
};

// Submit new feedback
const submitFeedback = async (feedbackData: Partial<Feedback>): Promise<ApiResponse> => {
  try {
    console.log('Submitting feedback with data:', feedbackData);
    
    const response = await axios.post(API_URL, feedbackData, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': getCsrfToken(),
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Feedback submission response:', response.data);
    
    return { 
      status: response.status, 
      message: response.data.message,
      data: response.data.feedbackId
    };
  } catch (error: any) {
    return handleApiError(error, 'submitFeedback');
  }
};

// Get user's feedback history with pagination
const getUserFeedbackHistory = async (page: number = 1, limit: number = 10): Promise<ApiResponse<Feedback[]>> => {
  try {
    const url = `${API_URL}/my-history`;
    console.log(`Fetching feedback history from: ${url}`);
    console.log(`Query params: page=${page}, limit=${limit}`);
    
    // Check if there's an Authorization token
    const authHeader = axios.defaults.headers.common['Authorization'];
    console.log('Authorization header present:', !!authHeader);
    
    // Log headers being sent for debugging
    console.log('Request headers:', {
      'X-CSRF-Token': getCsrfToken(),
      'Content-Type': 'application/json',
      'Authorization': authHeader ? 'Bearer token exists' : 'No token'
    });
    
    const response = await axios.get(url, {
      params: { page, limit },
      withCredentials: true,
      headers: {
        'X-CSRF-Token': getCsrfToken(),
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('Feedback history response status:', response.status);
    console.log('Feedback history response data:', response.data);
    
    // Validate response format to help with troubleshooting
    if (!response.data.data || !Array.isArray(response.data.data)) {
      console.warn('Unexpected response format:', response.data);
      
      // Try to handle different response structures
      if (response.data.success === true && Array.isArray(response.data.feedback)) {
        return {
          status: response.status,
          data: response.data.feedback,
          pagination: response.data.pagination
        };
      }
      
      return {
        status: response.status,
        data: response.data.data || [],
        error: 'Unexpected response format'
      };
    }
    
    return { 
      status: response.status, 
      data: response.data.data,
      pagination: response.data.pagination
    };
  } catch (error: any) {
    console.error('Error details in getUserFeedbackHistory:', error);
    
    // Network error handling
    if (error.code === 'ECONNABORTED') {
      return {
        status: 408,
        error: 'Request timeout - server took too long to respond'
      };
    }
    
    if (!error.response) {
      return {
        status: 0, 
        error: 'Network error - could not connect to the server'
      };
    }
    
    return handleApiError(error, 'getUserFeedbackHistory');
  }
};

const feedbackService = {
  submitFeedback,
  getUserFeedbackHistory,
  testConnection
};

export default feedbackService; 