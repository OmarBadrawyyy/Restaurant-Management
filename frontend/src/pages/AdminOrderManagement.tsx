import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import orderService, { Order, OrderStatus } from '../services/orderService';
import { getAdminOrders, updateOrderStatusDirect, deleteOrderDirect } from '../services/orderService';
import { FiEdit, FiRefreshCw, FiPackage } from 'react-icons/fi';
import { AiOutlineDelete } from 'react-icons/ai';
import { BiCheck, BiX } from 'react-icons/bi';
import { format } from 'date-fns';
import axios from 'axios';
import { ORDER_STATUSES } from '../hooks/useOrders';

// Icon Button Component
const IconButton = ({ 
  icon: Icon, 
  onClick, 
  className, 
  title 
}: { 
  icon: any; 
  onClick: () => void; 
  className: string; 
  title: string;
}) => (
  <button 
    onClick={onClick} 
    className={className}
    title={title}
  >
    <Icon className="h-4 w-4" />
  </button>
);

// Admin Order Management Page
const AdminOrderManagement: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Selected order for details view or actions
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: 'delete' | 'status';
    orderId: string;
    orderNumber: string;
    newStatus?: OrderStatus;
  } | null>(null);

  // Check if user has admin privileges
  useEffect(() => {
    if (currentUser && !['admin', 'manager', 'staff'].includes(currentUser.role)) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Refresh CSRF token for secure API calls
  const refreshCsrfToken = async () => {
    try {
      // First try to get a fresh CSRF token
      const response = await axios.get('/api/csrf-token', { 
        withCredentials: true 
      });
      
      // Use the token from response if available
      if (response.data && response.data.csrfToken) {
        axios.defaults.headers.common['X-CSRF-Token'] = response.data.csrfToken;
        console.log("Fresh CSRF token applied");
        return true;
      }
      
      // Fallback to cookie if response doesn't have token
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
        
      if (token) {
        axios.defaults.headers.common['X-CSRF-Token'] = decodeURIComponent(token);
        console.log("CSRF token applied from cookie");
        return true;
      }
      
      console.warn("No CSRF token found");
      return false;
    } catch (err) {
      console.error("Error refreshing CSRF token:", err);
      return false;
    }
  };

  // Handle session errors
  const handleSessionError = (error: any): boolean => {
    const errorMessage = error?.response?.data?.message || error.message;
    
    // Check if error is related to auth token or session issues
    const isAuthError = 
      error?.response?.status === 401 || 
      errorMessage?.includes('Invalid token') ||
      errorMessage?.includes('session') ||
      errorMessage?.includes('authentication');

    // Check for invalid order ID format errors
    const isInvalidIdError = 
      error?.response?.status === 400 && 
      errorMessage?.includes('Invalid order ID format');

    if (isAuthError) {
      setError('Authentication error. Please log in again.');
      return true;
    }
    
    if (isInvalidIdError) {
      setError('Invalid order ID format. Please try again with valid IDs.');
      return true;
    }
    
    return false;
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build filters with proper type handling
      const filters: { status?: OrderStatus, startDate?: string, endDate?: string } = {};
      
      if (statusFilter && statusFilter !== 'all') {
        // Only set status if it's a valid OrderStatus
        if (ORDER_STATUSES.includes(statusFilter as OrderStatus)) {
          filters.status = statusFilter as OrderStatus;
        }
      }
      
      if (dateRange.start) {
        filters.startDate = dateRange.start;
      }
      
      if (dateRange.end) {
        filters.endDate = dateRange.end;
      }
      
      // Try to use the new endpoint with retry capability first
      try {
        const response = await orderService.retryFetchOrders(filters);
        setOrders(response || []); // Ensure we always set an array
      } catch (retryError) {
        console.warn('Retry endpoint failed, using standard endpoint:', retryError);
        
        // Fallback to the standard endpoint
        const orderData = await getAdminOrders(filters);
        
        if (orderData && orderData.status === 200) {
          setOrders(orderData.data || []); // Ensure we always set an array
        } else {
          setError(orderData?.error || 'Failed to load orders');
          setOrders([]); // Set empty array on error
        }
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      
      // Handle session errors
      if (!handleSessionError(error)) {
        // If not a session error, display the general error
        const errorMessage = error?.response?.data?.message || 'Failed to load orders';
        setError(errorMessage);
      }
      setOrders([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch orders on component mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateRange.start, dateRange.end]);

  // Try again handler for session errors
  const handleTryAgain = async () => {
    // Clear any error state
    setError(null);
    
    try {
      // Refresh CSRF token
      const tokenRefreshed = await refreshCsrfToken();
      
      if (tokenRefreshed) {
        try {
          // Build filters with proper type handling
          const filters: { status?: OrderStatus, startDate?: string, endDate?: string } = {};
          
          if (statusFilter && statusFilter !== 'all') {
            // Only set status if it's a valid OrderStatus
            if (ORDER_STATUSES.includes(statusFilter as OrderStatus)) {
              filters.status = statusFilter as OrderStatus;
            }
          }
          
          if (dateRange.start) {
            filters.startDate = dateRange.start;
          }
          
          if (dateRange.end) {
            filters.endDate = dateRange.end;
          }
          
          // Try using the dedicated retry endpoint
          const response = await orderService.retryFetchOrders(filters);
          setOrders(response || []); // Ensure we always set an array
        } catch (retryError) {
          console.warn('Retry endpoint failed, using standard fetch:', retryError);
          // Retry fetching orders through standard method
          await fetchOrders();
        }
      } else {
        toast.error("Unable to refresh authentication. Please log in again.");
        logout();
        navigate('/login');
      }
    } catch (err) {
      console.error('Error retrying:', err);
      toast.error("Failed to refresh data. Please try logging in again.");
      // If the retry fails, redirect to login
      logout();
      navigate('/login');
    }
  };

  // Filter orders based on search
  const filteredOrders = orders?.filter(order => {
    // Skip if order object is malformed
    if (!order || typeof order !== 'object') return false;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Match against order number, customer name, customer phone, etc.
    const matchesSearch = 
      (order.orderNumber || '').toLowerCase().includes(searchLower) ||
      (order.customerName || '').toLowerCase().includes(searchLower) ||
      (order.contactPhone || '').includes(searchLower);
    
    return matchesSearch;
  }) || [];

  // Open order details modal with edit functionality
  const handleOpenOrderModal = (order: Order) => {
    // Make a deep copy of the order to prevent direct state mutation
    const orderCopy = JSON.parse(JSON.stringify(order));
    
    // Convert string delivery address to object if needed
    if (orderCopy.isDelivery && typeof orderCopy.deliveryAddress === 'string') {
      const addressStr = orderCopy.deliveryAddress;
      const addressParts = addressStr.split(',').map((part: string) => part.trim());
      
      if (addressParts.length >= 4) {
        // If address has enough parts, parse it into structured object
        orderCopy.deliveryAddress = {
          street: addressParts[0],
          city: addressParts[1],
          state: addressParts[2],
          zipCode: addressParts[3],
          additionalInfo: addressParts.slice(4).join(', ')
        };
      } else {
        // Create minimal valid address object
        orderCopy.deliveryAddress = {
          street: addressStr || '',
          city: '',
          state: '',
          zipCode: ''
        };
      }
    }
    
    setSelectedOrder(orderCopy);
    setIsModalOpen(true);
  };

  // Handle changes to order fields in the modal
  const handleOrderFieldChange = (field: string, value: any) => {
    if (!selectedOrder) return;
    
    setSelectedOrder(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev };
      
      // Handle nested fields with dot notation
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        if (parent === 'deliveryAddress') {
          // Handle deliveryAddress specifically since it's a known property
          if (typeof updated.deliveryAddress === 'object') {
            // Only update an existing object
            const currentAddress = { ...updated.deliveryAddress };
            currentAddress[child as keyof typeof currentAddress] = value;
            updated.deliveryAddress = currentAddress;
          } else if (typeof updated.deliveryAddress === 'string') {
            // Convert string to object if needed
            try {
              // Attempt to parse if it's a JSON string
              const addressObj = JSON.parse(updated.deliveryAddress);
              addressObj[child] = value;
              updated.deliveryAddress = addressObj;
            } catch (e) {
              // If not a valid JSON string, create a new object with defaults
              updated.deliveryAddress = {
                street: child === 'street' ? value : '',
                city: child === 'city' ? value : '',
                state: child === 'state' ? value : '',
                zipCode: child === 'zipCode' ? value : '',
                additionalInfo: child === 'additionalInfo' ? value : ''
              };
            }
          } else {
            // Create a new address object with all required fields
            updated.deliveryAddress = {
              street: child === 'street' ? value : '',
              city: child === 'city' ? value : '',
              state: child === 'state' ? value : '',
              zipCode: child === 'zipCode' ? value : '',
              additionalInfo: child === 'additionalInfo' ? value : ''
            };
          }
        }
      } else {
        // Handle direct fields that we know exist in the Order type
        switch(field) {
          case 'customerName':
            updated.customerName = value;
            break;
          case 'contactPhone':
            updated.contactPhone = value;
            break;
          case 'isDelivery':
            updated.isDelivery = value;
            break;
          case 'tableNumber':
            updated.tableNumber = value;
            break;
          case 'paymentMethod':
            updated.paymentMethod = value;
            break;
          case 'specialInstructions':
            updated.specialInstructions = value;
            break;
          // Add other fields as needed
        }
      }
      
      return updated;
    });
  };

  // Save edited order
  const handleSaveOrderChanges = async () => {
    if (!selectedOrder) return;
    
    try {
      setIsLoading(true);
      
      // Get a fresh CSRF token before saving
      await refreshCsrfToken();
      
      // Create a payload with only the fields we want to update
      let updatePayload: any = {
        customerName: selectedOrder.customerName,
        contactPhone: selectedOrder.contactPhone,
        specialInstructions: selectedOrder.specialInstructions,
        isDelivery: selectedOrder.isDelivery,
        tableNumber: selectedOrder.tableNumber
      };
      
      // Handle delivery address - ensure it's in the correct format
      if (selectedOrder.isDelivery) {
        if (typeof selectedOrder.deliveryAddress === 'string') {
          // If it's a simple string, try to convert to the required object
          const addressStr = selectedOrder.deliveryAddress;
          const addressParts = addressStr.split(',').map(part => part.trim());
          
          if (addressParts.length >= 4) {
            // If we have enough parts, create a structured object
            updatePayload.deliveryAddress = {
              street: addressParts[0],
              city: addressParts[1],
              state: addressParts[2],
              zipCode: addressParts[3],
              additionalInfo: addressParts.slice(4).join(', ')
            };
          } else {
            // Not enough parts, create a minimal valid object to prevent type errors
            updatePayload.deliveryAddress = {
              street: addressStr || '',
              city: '',
              state: '',
              zipCode: ''
            };
          }
        } else {
          // If it's already an object, use it directly
          updatePayload.deliveryAddress = selectedOrder.deliveryAddress;
        }
      }
      
      // Make the API call to update the order
      const response = await axios.put(
        `/api/orders/${selectedOrder.id}`, 
        updatePayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': axios.defaults.headers.common['X-CSRF-Token']
          },
          withCredentials: true
        }
      );
      
      if (response.status === 200) {
        // Update the local state with the edited order
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === selectedOrder.id ? response.data : order
          )
        );
        
        toast.success('Order updated successfully');
        setIsModalOpen(false);
        setSelectedOrder(null);
      } else {
        toast.error('Failed to update order');
      }
    } catch (error: any) {
      console.error('Error saving order changes:', error);
      
      // Handle session errors
      if (!handleSessionError(error)) {
        toast.error(error.response?.data?.message || 'Failed to update order');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show confirmation dialog for actions
  const showConfirmationDialog = (action: 'delete' | 'status', order: Order, newStatus?: OrderStatus) => {
    setConfirmAction({
      action,
      orderId: order.id,
      orderNumber: order.orderNumber,
      newStatus
    });
    setShowConfirmDialog(true);
  };

  // Handle confirmation of actions
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    const { action, orderId, newStatus } = confirmAction;
    
    try {
      setIsLoading(true);
      
      // Get a fresh CSRF token before any action
      await refreshCsrfToken();
      
      switch (action) {
        case 'delete':
          await handleDeleteOrder(orderId);
          break;
        case 'status':
          if (newStatus) {
            await handleStatusChange(orderId, newStatus);
          }
          break;
      }
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  // Handle delete order
  const handleDeleteOrder = async (orderId: string) => {
    try {
      setIsLoading(true);
      
      const response = await deleteOrderDirect(orderId);
      
      if (response && response.status === 200) {
        // Remove the order from the local state
        setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        
        toast.success('Order deleted successfully');
        
        // Close modal if open
        if (selectedOrder?.id === orderId) {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }
      } else {
        toast.error(response?.error || 'Failed to delete order');
      }
    } catch (err: any) {
      // Handle session errors
      if (!handleSessionError(err)) {
        toast.error(err.response?.data?.message || 'Failed to delete order');
      }
      console.error('Error deleting order:', err);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setIsLoading(true);
      
      // Get a fresh CSRF token before any action
      await refreshCsrfToken();
      
      // Find the original order first to preserve its data
      const originalOrder = orders.find(order => order.id === orderId);
      
      if (!originalOrder) {
        toast.error('Order not found');
        return;
      }
      
      console.log('Changing order status:', {
        orderId,
        originalStatus: originalOrder.status,
        newStatus: newStatus,
        originalOrder
      });
      
      // First try to use the service method
      try {
        const updatedOrder = await orderService.updateOrderStatus({ id: orderId, status: newStatus });
        
        console.log('Service response:', updatedOrder);
        
        // Create a new merged order with explicit status override
        const mergedOrder = {
          ...originalOrder,
          ...(updatedOrder || {}),
          // Force these critical fields to be preserved or use new values if available
          id: orderId,
          orderNumber: originalOrder.orderNumber,
          customerName: originalOrder.customerName,
          total: originalOrder.total,
          items: originalOrder.items,
          // Explicitly set the status to what we requested, not what came back
          status: newStatus
        };
        
        console.log('Merged order:', mergedOrder);
        
        // Update the order in the local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? mergedOrder : order
          )
        );
        
        // Update selected order if it's the one being viewed
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(mergedOrder);
        }
        
        toast.success(`Order status updated to ${newStatus}`);
      } catch (serviceError) {
        console.warn('Service update method failed, using direct method:', serviceError);
        
        // Fallback to direct method
        const directResponse = await updateOrderStatusDirect(orderId, newStatus);
        
        console.log('Direct API response:', directResponse);
        
        if (directResponse.status === 200) {
          // Create a new merged order with explicit status override
          const updatedOrder = {
            ...originalOrder,
            status: newStatus
          };
          
          // Update the order in the local state
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === orderId ? updatedOrder : order
            )
          );
          
          // Update selected order if it's the one being viewed
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(updatedOrder);
          }
          
          toast.success(`Order status updated to ${newStatus}`);
        } else {
          console.error('Failed direct response:', directResponse);
          // Fix the TypeScript error by explicitly casting the error to string
          if ('error' in directResponse) {
            const errorMessage = directResponse.error as string || 'Failed to update order status';
            toast.error(errorMessage);
          } else {
            toast.error('Failed to update order status. Please try again.');
          }
        }
      }
    } catch (err: any) {
      console.error('Error in handleStatusChange:', err);
      // Handle session errors
      if (!handleSessionError(err)) {
        toast.error(err.response?.data?.message || 'Failed to update order status');
      }
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  // Format date for display
  const formatDateTime = (dateString: string | Date): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (err) {
      return 'Invalid date';
    }
  };

  // Helper function for status badge color
  const getStatusBadgeClass = (status: OrderStatus): string => {
    switch(status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-indigo-100 text-indigo-800';
      case 'ready':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Count orders by status
  const getOrderCountByStatus = (status: OrderStatus): number => {
    return orders.filter(order => order.status === status).length || 0;
  };

  // Loading spinner
  if (isLoading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Order Management</h1>
      <p className="text-gray-600 mb-6">Manage and track all restaurant orders</p>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button 
                className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleTryAgain}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Order Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {['pending', 'confirmed', 'preparing', 'ready'].map(status => (
          <div key={status} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">{status.charAt(0).toUpperCase() + status.slice(1)}</p>
                <p className="text-2xl font-bold">
                  {getOrderCountByStatus(status as OrderStatus)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${getStatusBadgeClass(status as OrderStatus)}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Status
            </label>
            <select 
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          {/* Search Query */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search (Order #, Customer, Phone)
            </label>
            <input
              type="text"
              placeholder="Search orders..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={fetchOrders}
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Orders Table */}
      {isLoading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
          <p className="mt-2 text-gray-600">Loading orders...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={handleTryAgain} 
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      ) : (!filteredOrders || filteredOrders.length === 0) ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-8 text-center">
            <p className="text-gray-500 text-lg">No orders found matching your criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateRange({ start: '', end: '' });
              }}
              className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Order #
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Customer
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Total
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(filteredOrders) && filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <p className="font-medium">{order.customerName || 'N/A'}</p>
                      {order.contactPhone && <p className="text-xs">{order.contactPhone}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${order.total?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                      {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Unknown'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center space-x-2">
                      <IconButton 
                        icon={FiEdit} 
                        onClick={() => handleOpenOrderModal(order)} 
                        className="text-indigo-600 hover:text-indigo-900" 
                        title="View Details" 
                      />
                      
                      {['pending', 'confirmed'].includes(order.status) && (
                        <IconButton 
                          icon={BiX} 
                          onClick={() => showConfirmationDialog('status', order, 'cancelled')} 
                          className="text-red-600 hover:text-red-900" 
                          title="Cancel Order" 
                        />
                      )}
                      
                      {['pending', 'confirmed', 'preparing'].includes(order.status) && (
                        <IconButton 
                          icon={BiCheck} 
                          onClick={() => {
                            const nextStatus = 
                              order.status === 'pending' ? 'confirmed' :
                              order.status === 'confirmed' ? 'preparing' : 'ready';
                            showConfirmationDialog('status', order, nextStatus as OrderStatus);
                          }} 
                          className="text-green-600 hover:text-green-900" 
                          title="Progress Status" 
                        />
                      )}
                      
                      <IconButton 
                        icon={AiOutlineDelete} 
                        onClick={() => showConfirmationDialog('delete', order)} 
                        className="text-red-600 hover:text-red-900"
                        title="Delete Order" 
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal with Edit Functionality */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-xl font-bold">Order #{selectedOrder.orderNumber}</h2>
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveOrderChanges}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedOrder(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Info Section - Editable */}
              <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Name:</label>
                    <input 
                      type="text" 
                      value={selectedOrder.customerName || ''} 
                      onChange={(e) => handleOrderFieldChange('customerName', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Phone:</label>
                    <input 
                      type="text" 
                      value={selectedOrder.contactPhone || ''} 
                      onChange={(e) => handleOrderFieldChange('contactPhone', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="col-span-2 flex items-center space-x-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="isDelivery"
                      checked={selectedOrder.isDelivery} 
                      onChange={(e) => handleOrderFieldChange('isDelivery', e.target.checked)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="isDelivery" className="text-sm">Delivery Order</label>
                  </div>
                  
                  {selectedOrder.isDelivery ? (
                    <div className="col-span-2">
                      <label className="text-sm text-gray-500 mb-1 block">Delivery Address:</label>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="Street Address"
                          value={
                            typeof selectedOrder.deliveryAddress === 'object' 
                              ? selectedOrder.deliveryAddress.street 
                              : ''
                          } 
                          onChange={(e) => handleOrderFieldChange('deliveryAddress.street', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input 
                            type="text" 
                            placeholder="City"
                            value={
                              typeof selectedOrder.deliveryAddress === 'object' 
                                ? selectedOrder.deliveryAddress.city 
                                : ''
                            } 
                            onChange={(e) => handleOrderFieldChange('deliveryAddress.city', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                          <input 
                            type="text" 
                            placeholder="State"
                            value={
                              typeof selectedOrder.deliveryAddress === 'object' 
                                ? selectedOrder.deliveryAddress.state 
                                : ''
                            } 
                            onChange={(e) => handleOrderFieldChange('deliveryAddress.state', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                          <input 
                            type="text" 
                            placeholder="Zip Code"
                            value={
                              typeof selectedOrder.deliveryAddress === 'object' 
                                ? selectedOrder.deliveryAddress.zipCode 
                                : ''
                            } 
                            onChange={(e) => handleOrderFieldChange('deliveryAddress.zipCode', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <input 
                          type="text" 
                          placeholder="Additional Info (optional)"
                          value={
                            typeof selectedOrder.deliveryAddress === 'object' 
                              ? selectedOrder.deliveryAddress.additionalInfo || '' 
                              : ''
                          } 
                          onChange={(e) => handleOrderFieldChange('deliveryAddress.additionalInfo', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm text-gray-500 mb-1 block">Table Number:</label>
                      <input 
                        type="number" 
                        value={selectedOrder.tableNumber || ''} 
                        onChange={(e) => handleOrderFieldChange('tableNumber', parseInt(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Order Details */}
              <div>
                <h3 className="font-medium mb-3">Order Details</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Date:</p>
                    <p className="font-medium">{formatDateTime(selectedOrder.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Type:</p>
                    <p className="font-medium">{selectedOrder.isDelivery ? 'Delivery' : 'Dine-in'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Payment Method:</p>
                    <select
                      value={selectedOrder.paymentMethod || 'cash'}
                      onChange={(e) => handleOrderFieldChange('paymentMethod', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="cash">Cash</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="mobile_payment">Mobile Payment</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Status:</p>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(selectedOrder.status)}`}>
                        {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                      </span>
                      
                      {/* Status change dropdown */}
                      {selectedOrder && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                        <select
                          className="text-sm border border-gray-300 rounded-md px-2 py-1"
                          value={selectedOrder.status}
                          onChange={(e) => {
                            if (selectedOrder) {
                              showConfirmationDialog('status', selectedOrder, e.target.value as OrderStatus);
                            }
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="preparing">Preparing</option>
                          <option value="ready">Ready</option>
                          <option value="delivered">Delivered</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Special Instructions:</label>
                    <textarea
                      value={selectedOrder.specialInstructions || ''}
                      onChange={(e) => handleOrderFieldChange('specialInstructions', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              
              {/* Order Items - View Only */}
              <div>
                <h3 className="font-medium mb-3">Order Items</h3>
                <div className="border rounded-md divide-y">
                  {Array.isArray(selectedOrder.items) ? (
                    selectedOrder.items.map((item, index) => (
                      <div key={index} className="p-3">
                        <div className="flex justify-between">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="ml-2 text-sm text-gray-500">x{item.quantity}</span>
                          </div>
                          <span className="font-medium">${((item.price ?? 0) * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.specialInstructions && (
                          <p className="text-sm text-gray-500 mt-1">{item.specialInstructions}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">
                      No items available
                    </div>
                  )}
                  <div className="p-3 bg-gray-50">
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${selectedOrder.total?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Action</h2>
            <p className="mb-6">
              {confirmAction.action === 'delete' && 
                `Are you sure you want to delete order #${confirmAction.orderNumber}?`
              }
              {confirmAction.action === 'status' && confirmAction.newStatus === 'cancelled' &&
                `Are you sure you want to cancel order #${confirmAction.orderNumber}?`
              }
              {confirmAction.action === 'status' && confirmAction.newStatus !== 'cancelled' &&
                `Update order #${confirmAction.orderNumber} status to ${confirmAction.newStatus}?`
              }
            </p>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-white rounded-md ${
                  confirmAction.action === 'delete' || 
                  (confirmAction.action === 'status' && confirmAction.newStatus === 'cancelled')
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderManagement;