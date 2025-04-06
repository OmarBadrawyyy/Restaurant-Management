import axios from 'axios';
import { fetchCsrfToken } from './axiosCsrfConfig';

// API URL for order operations
const API_URL = '/api/orders';
const ADMIN_API_URL = '/api/admin/orders';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Add request interceptor to include CSRF token for non-GET requests
axios.interceptors.request.use(
  (config) => {
    // Only add CSRF token for non-GET requests
    if (config.method !== 'get') {
      const csrfTokenFromCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
      
      if (csrfTokenFromCookie) {
        config.headers['X-XSRF-TOKEN'] = csrfTokenFromCookie;
        console.log('Added CSRF token from cookie:', csrfTokenFromCookie.substring(0, 10) + '...');
      } else {
        // Try to get token from localStorage (might be stored there by auth system)
        const csrfTokenFromStorage = localStorage.getItem('csrfToken');
        if (csrfTokenFromStorage) {
          config.headers['X-XSRF-TOKEN'] = csrfTokenFromStorage;
          console.log('Added CSRF token from storage:', csrfTokenFromStorage.substring(0, 10) + '...');
        } else {
          console.warn('No CSRF token found for non-GET request to:', config.url);
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle specific error cases
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
      console.error('CSRF validation error. Please refresh the page and try again.');
      // You could trigger page refresh or logout here
    } else if (error.response?.status === 400 && error.response?.data?.message === 'Invalid order ID format') {
      console.error('Invalid order ID format. Please check the ID and try again.');
    }
    return Promise.reject(error);
  }
);

// Type definitions
export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'delivered' 
  | 'completed' 
  | 'cancelled';

export type PaymentMethod = 'cash' | 'credit_card' | 'mobile_payment' | 'debit_card' | 'online';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  additionalInfo?: string;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string | object; // Can be either customer ID or embedded object
  customerName?: string;
  contactPhone?: string;
  email?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  totalPrice?: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  isDelivery: boolean;
  deliveryAddress?: DeliveryAddress | string;
  tableNumber?: number;
  specialInstructions?: string;
  estimatedDeliveryTime?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  deliveryType?: 'pickup' | 'delivery' | 'PICKUP' | 'DELIVERY' | 'STANDARD';
}

// OrderImpl class implements Order with backward compatibility
class OrderImpl implements Order {
  id: string;
  orderNumber: string;
  customer: string | object;
  customerName?: string;
  contactPhone?: string;
  email?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  isDelivery: boolean;
  deliveryAddress?: DeliveryAddress | string;
  tableNumber?: number;
  specialInstructions?: string;
  estimatedDeliveryTime?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  deliveryType?: 'pickup' | 'delivery' | 'PICKUP' | 'DELIVERY' | 'STANDARD';

  constructor(data: any) {
    this.id = data.id;
    this.orderNumber = data.orderNumber;
    this.customer = data.customer;
    this.customerName = data.customerName;
    this.contactPhone = data.contactPhone;
    this.email = data.email;
    this.items = Array.isArray(data.items) ? data.items : [];
    this.subtotal = data.subtotal || 0;
    this.tax = data.tax || 0;
    this.tip = data.tip;
    this.total = data.total || data.totalPrice || 0;
    this.status = data.status || 'pending';
    this.paymentMethod = data.paymentMethod || 'cash';
    this.paymentStatus = data.paymentStatus || 'pending';
    this.isDelivery = data.isDelivery || false;
    this.deliveryAddress = data.deliveryAddress;
    this.tableNumber = data.tableNumber;
    this.specialInstructions = data.specialInstructions;
    this.estimatedDeliveryTime = data.estimatedDeliveryTime;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deliveryType = data.deliveryType || (data.isDelivery ? 'delivery' : 'pickup');
  }

  // For backward compatibility with older code
  get totalPrice(): number {
    return this.total;
  }
}

// Type for order creation request
export interface CreateOrderRequest {
  customerName: string;
  contactPhone: string;
  email: string;
  items: OrderItem[];
  isDelivery: boolean;
  deliveryAddress?: DeliveryAddress;
  paymentMethod: PaymentMethod;
  specialInstructions?: string;
  tableNumber?: number;
  deliveryType?: 'pickup' | 'delivery' | 'PICKUP' | 'DELIVERY' | 'STANDARD';
  subtotal?: number;
  tax?: number;
  total?: number;
}

// Type for order status update request
export interface UpdateOrderStatusRequest {
  id: string;
  status: OrderStatus;
}

// Type for order filters
export interface OrderFilters {
  status?: OrderStatus;
  customerId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  limit?: number;
  page?: number;
}

// API functions
const orderService = {
  /**
   * Get all orders - admin only
   */
  getAllOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status) {
        params.append('status', filters.status);
      }
      
      if (filters?.startDate) {
        params.append('startDate', new Date(filters.startDate).toISOString());
      }
      
      if (filters?.endDate) {
        params.append('endDate', new Date(filters.endDate).toISOString());
      }
      
      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }
      
      if (filters?.page) {
        params.append('page', filters.page.toString());
      }
      
      // Add cache-busting timestamp to prevent 304 responses causing empty data issues
      params.append('_t', Date.now().toString());
      
      const response = await axios.get(`${API_URL}/all`, { 
        params,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      
      return response.data.orders ? response.data.orders.map((order: any) => new OrderImpl(order)) : [];
    } catch (error: any) {
      console.error('Error fetching all orders:', error);
      
      // Specific error handling for invalid ID format
      if (error.response?.status === 400 && error.response?.data?.message?.includes('Invalid order ID format')) {
        throw new Error('Invalid order ID format. Please check your filters and try again.');
      }
      
      throw new Error('Failed to fetch all orders');
    }
  },

  /**
   * Get orders for the current user
   */
  getUserOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status) {
        params.append('status', filters.status);
      }
      
      if (filters?.startDate) {
        params.append('startDate', new Date(filters.startDate).toISOString());
      }
      
      if (filters?.endDate) {
        params.append('endDate', new Date(filters.endDate).toISOString());
      }
      
      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }
      
      if (filters?.page) {
        params.append('page', filters.page.toString());
      }
      
      const response = await axios.get(API_URL, { params });
      
      return response.data.map((order: any) => new OrderImpl(order));
    } catch (error: any) {
      console.error('Error fetching user orders:', error);
      throw new Error('Failed to fetch your orders');
    }
  },

  /**
   * Get a specific order by ID
   */
  getOrderById: async (id: string): Promise<Order> => {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      // Transform response data to match Order interface
      const orderData = {
        ...response.data,
        items: response.data.items || [],
        total: response.data.total || response.data.totalPrice || 0,
        status: response.data.status || 'pending',
        paymentMethod: response.data.paymentMethod || 'cash',
        paymentStatus: response.data.paymentStatus || 'pending',
        isDelivery: response.data.isDelivery || false,
        createdAt: response.data.createdAt || new Date(),
        orderNumber: response.data.orderNumber || `ORD-${response.data.id?.slice(-6)}`
      };
      return new OrderImpl(orderData);
    } catch (error: any) {
      console.error(`Error fetching order ${id}:`, error);
      throw new Error(`Failed to fetch order ${id}`);
    }
  },

  /**
   * Retry fetching orders - uses dedicated endpoint to avoid caching issues
   */
  retryFetchOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status) {
        params.append('status', filters.status);
      }
      
      if (filters?.startDate) {
        params.append('startDate', new Date(filters.startDate).toISOString());
      }
      
      if (filters?.endDate) {
        params.append('endDate', new Date(filters.endDate).toISOString());
      }
      
      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }
      
      if (filters?.page) {
        params.append('page', filters.page.toString());
      }
      
      // Add cache-busting timestamp
      params.append('_t', Date.now().toString());
      
      const response = await axios.get(`${API_URL}/retry`, { 
        params,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      
      // Ensure we always return an array, even when data is undefined or has no orders property
      return response.data?.orders ? response.data.orders.map((order: any) => new OrderImpl(order)) : [];
    } catch (error: any) {
      console.error('Error retrying order fetch:', error);
      
      // Convert to more user-friendly error
      if (error.response?.status === 400 && error.response?.data?.message?.includes('Invalid order ID format')) {
        throw new Error('Invalid ID format in order query. Please check your filters and try again.');
      }
      
      throw new Error('Failed to retry order fetch');
    }
  },

  /**
   * Create a new order with improved CSRF handling
   */
  createOrder: async (orderData: CreateOrderRequest): Promise<Order> => {
    try {
      // First refresh CSRF token
      await fetchCsrfToken();
      
      // Add delivery_type in snake_case for backend compatibility
      const apiOrderData = {
        ...orderData,
        // Use standard delivery type value that the backend expects
        deliveryType: "STANDARD",
        delivery_type: "STANDARD"
      };
      
      // Add debug logging before sending the order request
      console.log('Order data before sending:', JSON.stringify({
        isDelivery: apiOrderData.isDelivery,
        deliveryType: apiOrderData.deliveryType,
        delivery_type: apiOrderData.delivery_type
      }));
      
      const response = await axios.post(API_URL, apiOrderData);
      
      if (!response.data) {
        throw new Error('Server returned empty response');
      }
      
      // Handle different API response formats
      const orderResponse = response.data.order || response.data;
      return new OrderImpl(orderResponse);
    } catch (error: any) {
      console.error('Error creating order:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      
      throw error;
    }
  },

  /**
   * Update the status of an order
   */
  updateOrderStatus: async ({ id, status }: UpdateOrderStatusRequest): Promise<Order> => {
    try {
      const response = await axios.put(`${API_URL}/${id}/status`, { status });
      return new OrderImpl(response.data);
    } catch (error: any) {
      console.error(`Error updating order ${id} status:`, error);
      
      // Specific error handling for invalid ID format
      if (error.response?.status === 400 && error.response?.data?.message?.includes('Invalid order ID format')) {
        throw new Error('Invalid order ID format. Please check the order ID and try again.');
      }
      
      throw new Error(`Failed to update order status: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Cancel an order
   */
  cancelOrder: async (orderId: string): Promise<Order> => {
    try {
      const response = await axios.post(`${API_URL}/${orderId}/cancel`);
      return new OrderImpl(response.data.data);
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400 && error.response?.data?.message?.includes('Cannot cancel order in')) {
        throw new Error(error.response.data.message);
      }
      
      if (error.response?.status === 403) {
        throw new Error('You do not have permission to cancel this order');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to cancel order');
    }
  },

  /**
   * Delete an order (admin only)
   */
  deleteOrder: async (id: string): Promise<boolean> => {
    try {
      const response = await axios.delete(`${API_URL}/${id}`);
      return response.status === 200 || response.status === 204;
    } catch (error: any) {
      console.error(`Error deleting order ${id}:`, error);
      
      if (error.response?.status === 403) {
        throw new Error('Permission denied: You cannot delete this order');
      }
      
      throw new Error('Failed to delete order');
    }
  },

  /**
   * Track an order's status and details
   */
  trackOrder: async (id: string): Promise<Order> => {
    try {
      const response = await axios.get(`${API_URL}/${id}/track`);
      return new OrderImpl(response.data);
    } catch (error: any) {
      console.error(`Error tracking order ${id}:`, error);
      throw new Error('Failed to track order');
    }
  },

  /**
   * Get order statistics (admin only)
   */
  getOrderStats: async (timeFrame: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<any> => {
    try {
      const response = await axios.get(`${API_URL}/stats`, {
        params: { timeFrame }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching order statistics:', error);
      throw new Error('Failed to fetch order statistics');
    }
  },

  /**
   * Get order status counts for dashboard
   */
  getOrderStatusCounts: async (): Promise<any> => {
    try {
      const response = await axios.get(`${API_URL}/status-counts`);
      return response.data.data || { pending: 0, confirmed: 0, preparing: 0, ready: 0 };
    } catch (error: any) {
      console.error('Error fetching order status counts:', error);
      throw new Error('Failed to fetch order status counts');
    }
  },
};

// Export the service as default
export default orderService;

// Re-add the deleteOrderDirect function
export const deleteOrderDirect = async (id: string) => {
  try {
    console.log(`Deleting order ID: ${id}`);
    // Try direct endpoint for managers and admins
    try {
      console.log(`Trying to delete via endpoint: ${API_URL}/${id}`);
      const response = await axios.delete(`${API_URL}/${id}`);
      console.log('Delete success, response:', response.status);
      return {
        status: 200,
        data: response.data
      };
    } catch (error) {
      console.error('Error during delete:', error);
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return {
      status: error.response?.status || 500,
      error: error.response?.data?.message || 'Failed to delete order'
    };
  }
};

// Mock data generator for demo/development purposes
function generateMockOrders(count: number): Order[] {
  const orders: Order[] = [];
  const statuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];
  const paymentMethods: PaymentMethod[] = ['cash', 'credit_card', 'debit_card', 'mobile_payment', 'online'];
  const paymentStatuses: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];
  
  for (let i = 0; i < count; i++) {
    const id = `mock-${Math.random().toString(36).substring(2, 10)}`;
    orders.push(generateMockOrder(id, {
      status: statuses[Math.floor(Math.random() * statuses.length)],
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
      isDelivery: Math.random() > 0.5
    }));
  }
  
  return orders;
}

function generateMockOrder(id: string, overrides: Partial<Order> = {}): Order {
  const itemCount = Math.floor(Math.random() * 4) + 1;
  const items: OrderItem[] = [];
  
  const menuItems = [
    { name: 'Burger', price: 12.99 },
    { name: 'Pizza', price: 14.99 },
    { name: 'Pasta', price: 13.50 },
    { name: 'Salad', price: 8.99 },
    { name: 'Steak', price: 22.99 },
    { name: 'Fish & Chips', price: 16.50 },
  ];
  
  let subtotal = 0;
  
  for (let i = 0; i < itemCount; i++) {
    const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    const item: OrderItem = {
      menuItemId: `item-${Math.random().toString(36).substring(2, 10)}`,
      quantity: quantity,
      name: menuItem.name,
      price: menuItem.price
    };
    
    items.push(item);
    subtotal += item.quantity * item.price;
  }
  
  const tax = Number((subtotal * 0.1).toFixed(2));
  const total = subtotal + tax;
  
  const timestamp = new Date();
  timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 60 * 24)); // Up to 24 hours ago
  
  const customerNames = [
    'John Smith',
    'Jane Doe',
    'Robert Johnson',
    'Sarah Williams',
    'Michael Brown'
  ];
  
  return {
    id,
    orderNumber: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
    customer: `customer-${Math.random().toString(36).substring(2, 10)}`,
    customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
    contactPhone: `555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
    email: `customer${Math.floor(Math.random() * 100)}@example.com`,
    items,
    subtotal,
    tax,
    total,
    status: 'pending',
    paymentMethod: 'credit_card',
    paymentStatus: 'paid',
    isDelivery: false,
    deliveryAddress: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
    },
    tableNumber: Math.floor(Math.random() * 10) + 1,
    specialInstructions: 'Extra sauce please',
    estimatedDeliveryTime: timestamp.toISOString(),
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString(),
    ...overrides
  };
}

/**
 * Direct API functions for admin/manager order operations
 */
// Get all orders for admin/manager with direct API access
export const getAdminOrders = async (filters?: { status?: string, startDate?: string, endDate?: string }) => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }
    
    // Add cache-busting timestamp
    params.append('_t', Date.now().toString());
    
    // Try admin endpoint first, which works for both admins and managers
    console.log('Fetching orders from admin endpoint');
    try {
      const response = await axios.get(`${ADMIN_API_URL}`, {
        params,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      
      // Return response with standard structure, handling null/undefined data
      return {
        status: response.status,
        data: response.data?.orders ? response.data.orders.map((order: any) => new OrderImpl(order)) : [],
        totalCount: response.data?.totalCount || 0,
        page: response.data?.page || 1,
        totalPages: response.data?.totalPages || 1
      };
    } catch (adminError) {
      console.log('Admin endpoint failed, falling back to regular endpoint', adminError);
      // If admin endpoint fails, fall back to regular endpoint
      const response = await axios.get(`${API_URL}/all`, {
        params,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });

      // Return response with standard structure, handling null/undefined data
      return {
        status: response.status,
        data: response.data?.orders ? response.data.orders.map((order: any) => new OrderImpl(order)) : [],
        totalCount: response.data?.totalCount || 0,
        page: response.data?.page || 1,
        totalPages: response.data?.totalPages || 1
      };
    }
  } catch (error: any) {
    console.error('Error fetching admin/manager orders:', error);
    
    if (error.response?.status === 400 && error.response?.data?.message === 'Invalid order ID format') {
      return {
        status: 400,
        error: 'Invalid order ID format in query filters. Please check your filters and try again.',
        data: [] // Provide empty array to prevent mapping errors
      };
    }
    
    return {
      status: error.response?.status || 500,
      error: error.response?.data?.message || 'Failed to fetch orders',
      data: [] // Provide empty array to prevent mapping errors
    };
  }
};

// Update order status with direct API - works for both admin and manager
export const updateOrderStatusDirect = async (id: string, status: OrderStatus) => {
  try {
    if (!id) {
      throw new Error('Order ID is required');
    }
    
    if (!status) {
      throw new Error('Status is required');
    }

    // Try admin endpoint first
    console.log(`Updating order status via admin endpoint: ${id} to ${status}`);
    try {
      const response = await axios.put(`${ADMIN_API_URL}/${id}/status`, { status });
      return {
        status: response.status,
        data: new OrderImpl(response.data.data),
        message: response.data.message || 'Order status updated successfully'
      };
    } catch (adminError) {
      console.log('Admin endpoint failed, trying regular endpoint', adminError);
      // Fall back to regular endpoint
      const response = await axios.put(`${API_URL}/${id}/status`, { status });
      return {
        status: response.status,
        data: new OrderImpl(response.data),
        message: response.data.message || 'Order status updated successfully'
      };
    }
  } catch (error: any) {
    console.error('Error updating order status:', error);
    throw new Error(error.response?.data?.message || 'Failed to update order status');
  }
};