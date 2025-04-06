import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import userService, { User } from '../services/userService';
import menuService, { Category, MenuItem, refreshCsrfToken } from '../services/menuService';
import orderService, { Order, OrderItem, OrderStatus } from '../services/orderService';
import { format, parseISO, subDays } from 'date-fns';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import StaffManagementPage from './StaffManagementPage';
import MenuManagement from '../components/MenuManagement';
import CustomerIssuesManager from '../components/CustomerIssuesManager';
import AdminReservationManagement from '../components/AdminReservationManagement';
import AdminOrderManagement from './AdminOrderManagement';
import TableManagement from '../components/TableManagement';

// Helper function for formatting dates
const formatDate = (dateValue: string | Date): string => {
  try {
    if (dateValue instanceof Date) {
      return format(dateValue, 'MMM dd, yyyy h:mm a');
    }
    return format(parseISO(dateValue), 'MMM dd, yyyy h:mm a');
  } catch (error) {
    return String(dateValue);
  }
};

// Create placeholder components for missing imports
const RevenueChart: React.FC = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Revenue Chart</h2>
      <p className="text-gray-500">Chart data visualization would appear here</p>
    </div>
  );
};

// Add this type extension at the top of the file
type OrderWithUI = Order & {
  isUpdating?: boolean;
};

// Add this interface for the order details modal
interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

// Define the OrderDetailsModal component
const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, order, onClose, onStatusChange }) => {
  if (!isOpen || !order) return null;
  
  const handleStatusChange = (newStatus: OrderStatus) => {
    onStatusChange(order.id, newStatus);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Order #{order.orderNumber}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">Created: {formatDate(order.createdAt)}</p>
          <p className="text-sm text-gray-600">Status: {order.status}</p>
          <p className="text-sm text-gray-600">Total: ${order.total?.toFixed(2)}</p>
        </div>
        
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Change Status</h4>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleStatusChange('confirmed')}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
            >
              Confirm
            </button>
            <button 
              onClick={() => handleStatusChange('preparing')}
              className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200"
            >
              Preparing
            </button>
            <button 
              onClick={() => handleStatusChange('ready')}
              className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
            >
              Ready
            </button>
            <button 
              onClick={() => handleStatusChange('delivered')}
              className="px-3 py-1 bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200"
            >
              Delivered
            </button>
            <button 
              onClick={() => handleStatusChange('completed')}
              className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
            >
              Completed
            </button>
            <button 
              onClick={() => handleStatusChange('cancelled')}
              className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
            >
              Cancelled
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Define the OrderStatusBadge component
const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-indigo-100 text-indigo-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(status)}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Staff modal interface
interface StaffModalProps {
  isOpen: boolean;
  staff: User | null;
  onClose: () => void;
  onSave: (staff: User) => void;
}

// Staff Modal Component
const StaffModal: React.FC<StaffModalProps> = ({ isOpen, staff, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    email: '',
    role: 'staff',
    phoneNumber: '',
    status: 'active',
    isActive: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (staff) {
      setFormData({
        username: staff.username,
        email: staff.email,
        role: staff.role,
        phoneNumber: staff.phoneNumber || '',
        status: staff.status || 'active',
        isActive: staff.isActive !== undefined ? staff.isActive : true
      });
    } else {
      // Reset form for new staff
      setFormData({
        username: '',
        email: '',
        role: 'staff',
        phoneNumber: '',
        status: 'active',
        isActive: true
      });
    }
    setError('');
  }, [staff]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      // Create mock dates if this is a new staff member
      if (!staff) {
        const now = new Date().toISOString();
        formData.createdAt = now;
        formData.updatedAt = now;
      }

      // In a real app, this would call userService.updateUser or userService.createUser
      // Here we're just passing the data back to the parent component
      onSave(formData as User);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        {/* Modal container */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h3>
            <button
              type="button"
              className="text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="p-3 mt-3 text-sm text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="text"
                  name="phoneNumber"
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  id="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="onLeave">On Leave</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="block ml-2 text-sm text-gray-700">
                  Active Account
                </label>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isSaving ? (
                  <>
                    <svg className="w-4 h-4 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StaffRoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'staff':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(role)}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'onleave':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(status)}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Define dashboard tab type
type DashboardTab = 'reservations' | 'menu' | 'categories' | 'orders' | 'staff' | 'customerIssues' | 'tables';

const ManagerDashboard: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<DashboardTab>('reservations');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [orders, setOrders] = useState<OrderWithUI[]>([]);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCategory, setSelectedCategory] = useState<Partial<Category> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [deleteCategoryData, setDeleteCategoryData] = useState<{ id: string; name: string } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    statusCounts: {} as Record<string, number>
  });
  
  // Add these states back
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({
    title: '',
    message: '',
    action: async () => {}
  });
  
  // Search functionality
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [chartData, setChartData] = useState<{
    labels: string[];
    revenueData: number[];
    ordersData: number[];
  }>({
    labels: [],
    revenueData: [],
    ordersData: []
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Function to fetch all dashboard data
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch categories
        const fetchedCategories = await menuService.getAllCategories();
        setCategories(fetchedCategories);
        
        // Fetch menu items
        const fetchedMenuItems = await menuService.getAllMenuItems();
        setMenuItems(fetchedMenuItems);
        
        // Fetch orders using the correct method
        const fetchedOrders = await orderService.getAllOrders();
        setOrders(fetchedOrders);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load data. Please try again later.');
        // Set empty arrays for data to prevent undefined errors
        setCategories([]);
        setMenuItems([]);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Remove fetchMenuItems from dependencies

  useEffect(() => {
    // Initialize menuItems as an empty array if it's null or undefined
    if (!menuItems) {
      setMenuItems([]);
    }
  }, [menuItems]);

  // This effect runs on component mount and when URL changes
  useEffect(() => {
    // Check for tab parameter in URL
    console.log('ManagerDashboard mounted, checking URL params and initializing data');
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['reservations', 'menu', 'categories', 'orders', 'staff', 'customerIssues', 'tables'].includes(tabParam)) {
      console.log(`Setting active tab to: ${tabParam}`);
      setActiveTab(tabParam as DashboardTab);
    } else {
      console.log('No valid tab param found, defaulting to reservations');
      setActiveTab('reservations');
    }
    
    // Always refetch menu items when dashboard loads
    console.log('Calling fetchMenuItems on initial load');
    fetchMenuItems();
    
    // Log when the component unmounts
    return () => {
      console.log('ManagerDashboard unmounting');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]); // We're manually handling fetchMenuItems to avoid dependencies issues

  // Add interfaces for API response types
  interface ApiResponse<T> {
    status: string | number;
    data?: T;
    message?: string;
    error?: string;
  }

  // Define the OrderStats type for better type safety
  interface OrderStats {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    statusCounts: Record<string, number>;
  }

  // Update the fetchMenuItems function with proper type definitions
  const fetchMenuItems = async () => {
    setLoading(true);
    console.log('Starting to fetch data for dashboard...');
    
    try {
      const currentUser = localStorage.getItem('currentUser') 
        ? JSON.parse(localStorage.getItem('currentUser') || '{}')
        : null;
      
      console.log('Current user role:', currentUser?.role);
      
      let menuItemsResult: MenuItem[] = [];
      let categoriesResult: Category[] = [];
      let orderStatsResult: OrderStats | null = null;
      let ordersResult: Order[] = [];
      let staffResult: User[] = [];
      
      if (currentUser?.role === 'manager') {
        console.log('Fetching data as manager...');
        
        const results = await Promise.allSettled([
          menuService.getAllMenuItems(),
          menuService.getAllCategories(),
          // Wrap these in try/catch to handle errors individually
          orderService.getOrderStats('daily').catch((err: Error) => {
            console.error('Error fetching order stats:', err);
            return null;
          }),
          orderService.getAllOrders().catch((err: Error) => {
            console.error('Error fetching orders:', err);
            return [];
          }),
        ]);
        
        console.log('API results received:', results.map(r => r.status));
        
        // Process results
        if (results[0].status === 'fulfilled') {
          const menuData = results[0].value as MenuItem[] | ApiResponse<MenuItem[]>;
          
          // Handle both array and object.data formats
          if (Array.isArray(menuData)) {
            menuItemsResult = menuData;
          } else if (menuData && typeof menuData === 'object' && 'data' in menuData && Array.isArray(menuData.data)) {
            menuItemsResult = menuData.data;
            console.log('Extracted menu items from data property');
          }
          console.log(`Received ${menuItemsResult?.length || 0} menu items`);
        } else {
          console.error('Failed to fetch menu items:', results[0].reason);
        }
        
        if (results[1].status === 'fulfilled') {
          const categoryData = results[1].value as Category[] | ApiResponse<Category[]>;
          if (Array.isArray(categoryData)) {
            categoriesResult = categoryData;
          } else if (categoryData && typeof categoryData === 'object' && 'data' in categoryData && Array.isArray(categoryData.data)) {
            categoriesResult = categoryData.data;
          }
          console.log(`Received ${categoriesResult?.length || 0} categories`);
        } else {
          console.error('Failed to fetch categories:', results[1].reason);
        }
        
        if (results[2].status === 'fulfilled' && results[2].value) {
          orderStatsResult = results[2].value as OrderStats;
        }
        
        if (results[3].status === 'fulfilled') {
          const orderData = results[3].value as Order[] | ApiResponse<Order[]>;
          if (Array.isArray(orderData)) {
            ordersResult = orderData;
          } else if (orderData && typeof orderData === 'object' && 'data' in orderData && Array.isArray(orderData.data)) {
            ordersResult = orderData.data;
          }
        }
      } else {
        console.log('Fetching data as admin...');
        
        const results = await Promise.allSettled([
          menuService.getAllMenuItems(),
          menuService.getAllCategories(),
          orderService.getOrderStats('daily'),
          orderService.getAllOrders(),
          userService.getAllUsers().catch(() => [] as User[])
        ]);
        
        console.log('API results received:', results.map(r => r.status));
        
        // Process results
        if (results[0].status === 'fulfilled') {
          const menuData = results[0].value as MenuItem[] | ApiResponse<MenuItem[]>;
          
          // Handle both array and object.data formats
          if (Array.isArray(menuData)) {
            menuItemsResult = menuData;
          } else if (menuData && typeof menuData === 'object' && 'data' in menuData && Array.isArray(menuData.data)) {
            menuItemsResult = menuData.data;
            console.log('Extracted menu items from data property');
          }
          console.log(`Received ${menuItemsResult?.length || 0} menu items`);
        } else {
          console.error('Failed to fetch menu items:', results[0].reason);
        }
        
        if (results[1].status === 'fulfilled') {
          const categoryData = results[1].value as Category[] | ApiResponse<Category[]>;
          if (Array.isArray(categoryData)) {
            categoriesResult = categoryData;
          } else if (categoryData && typeof categoryData === 'object' && 'data' in categoryData && Array.isArray(categoryData.data)) {
            categoriesResult = categoryData.data;
          }
        } else {
          console.error('Failed to fetch categories:', results[1].reason);
        }
        
        if (results[2].status === 'fulfilled' && results[2].value) {
          orderStatsResult = results[2].value as OrderStats;
        } else if (results[2].status === 'rejected') {
          console.error('Failed to fetch order stats:', results[2].reason);
        }
        
        if (results[3].status === 'fulfilled') {
          const orderData = results[3].value as Order[] | ApiResponse<Order[]>;
          if (Array.isArray(orderData)) {
            ordersResult = orderData;
          } else if (orderData && typeof orderData === 'object' && 'data' in orderData && Array.isArray(orderData.data)) {
            ordersResult = orderData.data;
          }
        } else {
          console.error('Failed to fetch orders:', results[3].reason);
        }
        
        if (results[4].status === 'fulfilled') {
          const userData = results[4].value as User[] | ApiResponse<User[]>;
          if (Array.isArray(userData)) {
            staffResult = userData;
          } else if (userData && typeof userData === 'object' && 'data' in userData && Array.isArray(userData.data)) {
            staffResult = userData.data;
          }
        } else {
          console.error('Failed to fetch staff:', results[4].reason);
        }
      }
      
      // Ensure all data is in the correct format
      if (!Array.isArray(menuItemsResult)) {
        console.warn('menuItemsResult is not an array, using empty array:', menuItemsResult);
        menuItemsResult = [];
      }
      
      if (!Array.isArray(categoriesResult)) {
        console.warn('categoriesResult is not an array, using empty array:', categoriesResult);
        categoriesResult = [];
      }
      
      if (!Array.isArray(ordersResult)) {
        console.warn('ordersResult is not an array, using empty array:', ordersResult);
        ordersResult = [];
      }
      
      if (!Array.isArray(staffResult)) {
        console.warn('staffResult is not an array, using empty array:', staffResult);
        staffResult = [];
      }
      
      // Set state with the processed results
      setMenuItems(menuItemsResult);
      setCategories(categoriesResult);
      setOrderStats(orderStatsResult || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusCounts: {}
      });
      setOrders(ordersResult);
      setStaff(staffResult);
      
      console.log('All data loaded successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error loading dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddMenuItem = () => {
    // Implementation
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEditMenuItem = (id: string) => {
    // Implementation
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteMenuItem = async (menuItemId: string) => {
    // Implementation
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleToggleAvailability = async (id: string, currentValue: boolean) => {
    // Implementation  
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleToggleFeatured = async (id: string, currentValue: boolean) => {
    // Implementation
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getCategoryName = (categoryId: string | null | undefined): string => {
    // Implementation
    return 'Uncategorized'; // Default return value to fix type error
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOrderFilter = async (status: string) => {
    // Implementation
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusBadgeClass = (status: Order['status']) => {
    // Implementation
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openOrderDetails = (order: Order) => {
    // Implementation
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openAddStaffModal = () => {
    // Implementation
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openEditStaffModal = (staff: User) => {
    // Implementation
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveStaff = async (staffData: User) => {
    // Implementation
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteStaff = async (id: string): Promise<ApiResponse<any>> => {
    // Implementation
    return { status: 500, error: 'Not implemented' }; // Default return value to fix type error
  };

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    
    // Update URL without reloading the page
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('tab', tab);
    window.history.replaceState(null, '', `?${searchParams.toString()}`);
    
    // You could also trigger specific data refreshes when tabs are changed
    if (tab === 'categories') {
      // Refresh categories when tab is shown
      const refreshCategories = async () => {
        try {
          const fetchedCategories = await menuService.getAllCategories();
          setCategories(fetchedCategories);
        } catch (error) {
          console.error('Error refreshing categories:', error);
          // Don't override existing categories on error
        }
      };
      refreshCategories();
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      // Show loading for this specific order
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, isUpdating: true } : order
      ));
      
      const updatedOrder = await orderService.updateOrderStatus({ id: orderId, status: newStatus });
      if (updatedOrder) {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...updatedOrder, isUpdating: false } : order
        ));
        
        // Update the selected order if it's open in the modal
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      // Revert the order status to original
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, isUpdating: false } : order
      ));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Add this additional useEffect for chart data
  useEffect(() => {
    // Generate last 7 days for chart
    const generateChartData = () => {
      const labels = [];
      const revenueData = [];
      const ordersData = [];
      
      // Generate 7 days of mock data
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        labels.push(format(date, 'MMM dd'));
        
        // Random data for demonstration
        const dailyOrders = Math.floor(Math.random() * 15) + 5;
        ordersData.push(dailyOrders);
        
        // Revenue based on orders with some randomness
        const dailyRevenue = dailyOrders * (Math.random() * 10 + 30);
        revenueData.push(parseFloat(dailyRevenue.toFixed(2)));
      }
      
      setChartData({ labels, revenueData, ordersData });
    };
    
    generateChartData();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const filteredMenuItems = useMemo(() => {
    if (!menuItems || !Array.isArray(menuItems)) {
      return [];
    }
    
    const searchTermLower = (menuSearchTerm || '').toLowerCase();
    if (!searchTermLower) return menuItems;
    
    return menuItems.filter(item => 
      item && 
      ((typeof item.name === 'string' && item.name.toLowerCase().includes(searchTermLower)) || 
       (typeof item.description === 'string' && item.description.toLowerCase().includes(searchTermLower)))
    );
  }, [menuItems, menuSearchTerm]);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const filteredStaff = useMemo(() => {
    if (!staffSearchTerm) return staff;
    
    const searchTermLower = staffSearchTerm.toLowerCase();
    return staff.filter(member => 
      member.username.toLowerCase().includes(searchTermLower) || 
      member.email.toLowerCase().includes(searchTermLower) ||
      member.role.toLowerCase().includes(searchTermLower)
    );
  }, [staff, staffSearchTerm]);

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await menuService.deleteCategory(categoryId);
      toast.success('Category deleted successfully');
      // Refresh the categories list
      const updatedCategories = await menuService.getAllCategories();
      setCategories(updatedCategories);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error; // Re-throw to be caught by the confirmation modal handler
    }
  };

  const handleDeleteConfirmation = (category: Category) => {
    setConfirmData({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${category.name}"?`,
      action: async () => handleDeleteCategory(category.id)
    });
    setIsConfirmModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('reservations')}
              className={`${
                activeTab === 'reservations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Reservations</span>
            </button>

            <button
              onClick={() => handleTabChange('menu')}
              className={`${
                activeTab === 'menu'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Menu</span>
            </button>

            <button
              onClick={() => handleTabChange('categories')}
              className={`${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Categories</span>
            </button>

            <button
              onClick={() => handleTabChange('orders')}
              className={`${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Orders</span>
            </button>

            <button
              onClick={() => handleTabChange('staff')}
              className={`${
                activeTab === 'staff'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Staff</span>
            </button>

            <button
              onClick={() => handleTabChange('customerIssues')}
              className={`${
                activeTab === 'customerIssues'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span>Customer Issues</span>
            </button>

            <button
              onClick={() => handleTabChange('tables')}
              className={`${
                activeTab === 'tables'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Tables</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'reservations' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-6">Reservation Management</h2>
                <AdminReservationManagement />
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <MenuManagement />
          )}

          {activeTab === 'categories' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Categories</h3>
                <button
                  onClick={() => navigate('/manager/categories/new')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add New Category
                </button>
              </div>
              
              {loading ? (
                <div className="p-10 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-500">Loading categories...</p>
                  </div>
              ) : categories.length === 0 ? (
                  <div className="text-center py-10">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No categories</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding a new category.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/manager/categories/new')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add New Category
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <li key={category.id} className="px-4 py-4 hover:bg-gray-50 transition-colors duration-150">
                      <div className="flex items-center justify-between">
                            <div className="flex items-center">
                          {category.imageUrl ? (
                            <img
                              src={category.imageUrl}
                              alt={category.name}
                              className="h-12 w-12 rounded-md object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-indigo-100 flex items-center justify-center">
                              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                              </svg>
                                  </div>
                                )}
                              <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                            {category.description && <div className="text-sm text-gray-500">{category.description}</div>}
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <button
                            onClick={() => navigate(`/manager/categories/${category.id}/edit`)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                                Edit
                              </button>
                              <button
                            onClick={() => handleDeleteConfirmation(category)}
                            className="text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                                      Delete
                                </button>
                            </div>
                </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <AdminOrderManagement />
            </div>
          )}

          {activeTab === 'staff' && (
            <StaffManagementPage />
          )}

          {activeTab === 'customerIssues' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <CustomerIssuesManager />
                      </div>
                    )}
                    
          {activeTab === 'tables' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <TableManagement />
            </div>
          )}

          {/* Replace the simple OrderDetailsModal with an enhanced version */}
          {isOrderDetailsModalOpen && selectedOrder && (
            <OrderDetailsModal
              isOpen={isOrderDetailsModalOpen}
              order={selectedOrder}
              onClose={() => setIsOrderDetailsModalOpen(false)}
              onStatusChange={handleOrderStatusChange}
            />
          )}

          {/* Staff Modal */}
          <StaffModal
            isOpen={isStaffModalOpen}
            staff={selectedStaff}
            onClose={() => setIsStaffModalOpen(false)}
            onSave={handleSaveStaff}
          />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setConfirmData({ title: '', message: '', action: async () => {} });
        }}
        onConfirm={async () => {
          try {
            await confirmData.action();
            setIsConfirmModalOpen(false);
          } catch (error) {
            console.error('Error in confirmation action:', error);
            toast.error('An error occurred. Please try again.');
          }
        }}
        title={confirmData.title}
        message={confirmData.message}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard; 