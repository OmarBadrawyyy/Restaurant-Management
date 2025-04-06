import axios from 'axios';

// Setup axios defaults
axios.defaults.withCredentials = true; // Always send cookies

// API endpoints
const API_BASE_URL = '/api';
const MENU_ITEMS_URL = `${API_BASE_URL}/menu-items`;
const CATEGORIES_URL = `${API_BASE_URL}/menu`;

// Type definitions
export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  imageUrl?: string;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string | Category;
  ingredients?: string[];
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergens?: string[];
  };
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isSpicy?: boolean;
  preparationTime?: number;
  isAvailable: boolean;
  isFeatured?: boolean;
  discountPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  isActive: boolean;
  imageUrl?: string;
  displayOrder?: number;
}

// Authentication helper
export const refreshCsrfToken = async (): Promise<string> => {
  try {
    const response = await axios.get('/api/csrf-token');
    const token = response.data.csrfToken;
    if (!token) {
      console.error('No CSRF token received from server');
      throw new Error('No CSRF token received');
    }
    
    // Store token in session storage for backup access
    sessionStorage.setItem('csrfToken', token);
    return token;
  } catch (error) {
    console.error('Error refreshing CSRF token:', error);
    throw error;
  }
};

// Helper function to get current CSRF token
export const getCsrfToken = (): string => {
  // Try to get it from axios headers first
  const axiosToken = axios.defaults.headers.common['X-CSRF-Token'];
  if (axiosToken) return axiosToken as string;
  
  // Fall back to sessionStorage
  const token = sessionStorage.getItem('csrfToken');
  if (token) return token;
  
  // Try from cookie as last resort
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN') {
      return decodeURIComponent(value);
    }
  }
  
  return '';
};

// Category API methods
const categoryApi = {
  // Get all categories
  getAllCategories: async (): Promise<Category[]> => {
    console.log('Fetching all categories...');
    try {
      const response = await axios.get(CATEGORIES_URL);
      console.log('Categories fetched successfully:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to load categories from database');
    }
  },

  // Get category by ID
  getCategoryById: async (id: string): Promise<Category | null> => {
    console.log(`Fetching category with ID: ${id}`);
    try {
      const response = await axios.get(`${CATEGORIES_URL}/id/${id}`);
      console.log('Category fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      return null;
    }
  },

  // Create category (admin only)
  createCategory: async (categoryData: Partial<Category>): Promise<Category> => {
    console.log('Starting category creation in menuService...');
    console.log('Category data:', categoryData);
    console.log('API endpoint:', CATEGORIES_URL);
    
    try {
      // Ensure we have a fresh CSRF token
      const token = await refreshCsrfToken();
      console.log('CSRF token obtained:', token ? '✓' : '✗');
      
      if (!token) {
        console.error('No CSRF token available - this will cause the request to fail');
        throw new Error('Security token missing. Please refresh the page and try again.');
      }
      
      // Use fetch API with detailed error handling
      const response = await fetch(CATEGORIES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token
        },
        credentials: 'include',
        body: JSON.stringify(categoryData)
      });
      
      console.log('Category create response status:', response.status);
      
      // Handle non-2xx responses
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.error('Error response data:', errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          try {
            // Try to get raw text if JSON parsing fails
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error('Could not get error text either:', textError);
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse successful response
      const data = await response.json();
      console.log('Category created successfully:', data);
      return data.menu || data;
    } catch (error) {
      console.error('Error in createCategory service:', error);
      // Rethrow to let component handle it
      throw error;
    }
  },

  // Update category (admin only)
  updateCategory: async (id: string, categoryData: Partial<Category>): Promise<Category> => {
    console.log(`Updating category ${id}:`, categoryData);
    try {
      console.log('CATEGORIES_URL:', CATEGORIES_URL);
      console.log('Full URL to be called:', `${CATEGORIES_URL}/id/${id}`);
      
      const token = await refreshCsrfToken();
      console.log('CSRF token retrieved for category update:', token ? 'Token exists' : 'No token');
      
      // Make sure we have a token
      if (!token) {
        console.warn('No CSRF token available for category update. Attempting anyway...');
      }
      
      // Get current axios defaults
      console.log('Current axios defaults:', {
        baseURL: axios.defaults.baseURL,
        timeout: axios.defaults.timeout,
        withCredentials: axios.defaults.withCredentials,
        headers: axios.defaults.headers.common
      });
      
      const headers = {
        'X-CSRF-Token': token || '',
        'Content-Type': 'application/json'
      };
      console.log('Request headers:', headers);
      console.log('Request data:', JSON.stringify(categoryData));
      
      // Try alternative approach - make a direct fetch request to test
      console.log('Attempting direct fetch to check if API is working...');
      try {
        const testResponse = await fetch(`${CATEGORIES_URL}/id/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token || '',
          },
          credentials: 'include',
          body: JSON.stringify(categoryData)
        });
        
        console.log('Direct fetch response status:', testResponse.status);
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('Direct fetch success:', testData);
          return testData.menu || testData;
        } else {
          console.error('Direct fetch failed with status:', testResponse.status);
          const errorText = await testResponse.text();
          console.error('Error response:', errorText);
        }
      } catch (fetchError) {
        console.error('Direct fetch error:', fetchError);
      }
      
      // Ensure credentials are included
      const requestConfig = {
        headers,
        withCredentials: true
      };
      
      // Try the request with detailed logging
      console.log('Sending PUT request with config:', requestConfig);
      const response = await axios.put(`${CATEGORIES_URL}/id/${id}`, categoryData, requestConfig);
      
      console.log('PUT request successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      return response.data.menu || response.data;
    } catch (error: any) {
      console.error(`Error updating category ${id}:`, error);
      
      // More detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error Response Status:', error.response.status);
        console.error('Error Response Data:', error.response.data);
        console.error('Error Response Headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
      }
      
      throw error;
    }
  },

  // Delete category (admin only)
  deleteCategory: async (id: string): Promise<{ message: string }> => {
    console.log(`Attempting to delete category with ID: ${id}`);
    
    // Function to retry the delete operation
    const attemptDelete = async (retryCount = 0, maxRetries = 2): Promise<any> => {
      try {
        // Get a fresh CSRF token
        let token = await refreshCsrfToken();
        console.log(`CSRF token retrieved for category deletion (attempt ${retryCount + 1}):`, token ? 'Valid token obtained' : 'No token obtained');
        
        // Log the full URL being called
        const fullUrl = `${CATEGORIES_URL}/id/${id}`;
        console.log(`Sending DELETE request to: ${fullUrl} (attempt ${retryCount + 1})`);
        
        // Use a more reliable direct fetch approach
        const response = await fetch(fullUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token || ''
          },
          credentials: 'include'
        });
        
        // Handle non-2xx responses with detailed error logging
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error response (${response.status}):`, errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { message: errorText || 'Unknown error' };
          }
          
          throw {
            status: response.status,
            response: { 
              status: response.status,
              data: errorData
            }
          };
        }
        
        // Parse the successful response
        const data = await response.json();
        console.log('Category deleted successfully. Response:', data);
        return data;
        
      } catch (error: any) {
        console.error(`Error deleting category ${id} (attempt ${retryCount + 1}):`, error);
        
        // Detailed error logging
        if (error.response) {
          console.error('Error response status:', error.response.status);
          console.error('Error response data:', error.response.data);
          
          // Check for specific errors that should not be retried
          if (error.response.status === 404) {
            console.log('Category not found - no need to retry');
            throw error; // Don't retry for non-existent resources
          }
          
          if (error.response.status === 400 && 
              error.response.data?.message?.includes('associated menu items')) {
            console.log('Category has associated items - no need to retry');
            throw error; // Don't retry when there are associated items
          }
        }
        
        // Retry logic
        if (retryCount < maxRetries) {
          console.log(`Retrying delete operation (${retryCount + 1}/${maxRetries})...`);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptDelete(retryCount + 1, maxRetries);
        }
        
        throw error;
      }
    };
    
    // Start the delete operation with retry logic
    return attemptDelete();
  }
};

// Menu Item API methods
const menuItemApi = {
  // Get all menu items
  getAllMenuItems: async (): Promise<MenuItem[]> => {
    try {
      const response = await axios.get(MENU_ITEMS_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching menu items:', error);
      throw new Error('Failed to load menu items from database');
    }
  },

  // Get menu items by category
  getMenuItemsByCategory: async (categoryId: string): Promise<MenuItem[]> => {
    try {
      const response = await axios.get(`${MENU_ITEMS_URL}/category/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching menu items by category:', error);
      throw new Error('Failed to load menu items for this category from database');
    }
  },

  // Get menu item by ID
  getMenuItemById: async (id: string): Promise<MenuItem | null> => {
    if (!id) return null;
    
    try {
      const response = await axios.get(`${MENU_ITEMS_URL}/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error(`Error fetching menu item ${id}:`, error);
      throw new Error('Failed to load menu item details from database');
    }
  },

  // Get featured menu items
  getFeaturedItems: async (): Promise<MenuItem[]> => {
    try {
      const response = await axios.get(`${MENU_ITEMS_URL}/featured`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching featured items:', error);
      throw new Error('Failed to load featured menu items from database');
    }
  },

  // Get special offers
  getSpecialOffers: async (): Promise<MenuItem[]> => {
    try {
      const response = await axios.get(MENU_ITEMS_URL, { 
        params: { discountPercentage_gt: 0 } 
      });
      return (response.data.data || response.data).filter(
        (item: MenuItem) => item.discountPercentage && item.discountPercentage > 0
      );
    } catch (error) {
      console.error('Error fetching special offers:', error);
      throw new Error('Failed to load special offers from database');
    }
  },

  // Create menu item (admin only)
  createMenuItem: async (menuItemData: Partial<MenuItem>): Promise<MenuItem> => {
    try {
      console.log('Starting createMenuItem in menuService...');
      // Handle category conversion if needed
      if (typeof menuItemData.category === 'string' && menuItemData.category) {
        // If it's not a valid MongoDB ID, try to find matching category by name
        if (!menuItemData.category.match(/^[0-9a-fA-F]{24}$/)) {
          try {
            const categories = await categoryApi.getAllCategories();
            const matchingCategory = categories.find(cat => 
              cat.id === menuItemData.category || 
              cat.name.toLowerCase() === (menuItemData.category as string).toLowerCase()
            );
            
            if (matchingCategory) {
              menuItemData.category = matchingCategory.id;
              console.log('Category converted from name to ID:', matchingCategory.id);
            }
          } catch (error) {
            console.error('Error finding category:', error);
          }
        }
      }
      
      console.log('Getting CSRF token...');
      const token = await refreshCsrfToken();
      console.log('CSRF token obtained:', token ? 'Valid token' : 'No token');
      
      if (!token) {
        throw new Error('Security token is missing. Please reload the page and try again.');
      }
      
      console.log('Making POST request to', MENU_ITEMS_URL);
      const response = await axios.post(MENU_ITEMS_URL, menuItemData, {
        headers: { 'X-CSRF-Token': token },
        withCredentials: true
      });
      
      console.log('Create menu item response:', response.status, response.statusText);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Error in createMenuItem:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error; // Re-throw for the caller to handle
    }
  },

  // Update menu item (admin only)
  updateMenuItem: async (payload: { id: string; data: Partial<MenuItem> }): Promise<MenuItem> => {
    const { id, data } = payload;
    const token = await refreshCsrfToken();
    const response = await axios.put(`${MENU_ITEMS_URL}/${id}`, data, {
      headers: token ? { 'X-CSRF-Token': token } : undefined,
      withCredentials: true
    });
    return response.data.data || response.data;
  },

  // Delete menu item (admin only)
  deleteMenuItem: async (id: string): Promise<{ message: string }> => {
    const token = await refreshCsrfToken();
    const response = await axios.delete(`${MENU_ITEMS_URL}/${id}`, {
      headers: token ? { 'X-CSRF-Token': token } : undefined,
      withCredentials: true
    });
    return response.data;
  }
};

// Combined API service
const menuService = {
  ...categoryApi,
  ...menuItemApi,
  refreshCsrfToken,
  getCsrfToken
};

export default menuService; 