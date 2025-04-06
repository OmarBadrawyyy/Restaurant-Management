import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../services/orderService';
import axios from 'axios';

// Define interface for raw API responses that might have different formats
interface RawOrderData {
  id?: string;
  _id?: string;
  orderNumber?: string;
  status: string;
  total?: number;
  totalAmount?: number;
  createdAt?: string | Date;
  created_at?: string | Date;
  items?: any[];
  [key: string]: any; // Allow any other properties
}

interface OrdersListProps {
  limit?: number;
  allowFiltering?: boolean;
}

const OrdersList: React.FC<OrdersListProps> = ({ limit, allowFiltering = true }) => {
  const [orders, setOrders] = useState<RawOrderData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchOrders();
  }, [limit, statusFilter, sortBy]);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try multiple approaches to get orders
      try {
        // Approach 1: Use orderService
        const response = await orderService.getUserOrders();
        let ordersData = response as RawOrderData[];
        
        // Apply filters and sorting
        ordersData = applyFiltersAndSort(ordersData);
        
        setOrders(ordersData);
        setIsLoading(false);
        return; // Exit if successful
      } catch (serviceErr) {
        console.warn('Failed to fetch orders using orderService, trying direct API call...', serviceErr);
      }

      // Approach 2: Use direct axios call
      try {
        const directResponse = await axios.get('/api/orders', { 
          // Add cache-busting
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Timestamp': Date.now()
          }
        });
        
        // Handle different API response formats
        let ordersData: RawOrderData[] = [];
        if (directResponse.data?.data) {
          ordersData = directResponse.data.data;
        } else if (Array.isArray(directResponse.data)) {
          ordersData = directResponse.data;
        } else if (directResponse.data?.orders) {
          ordersData = directResponse.data.orders;
        }
        
        // Apply filters and sorting
        ordersData = applyFiltersAndSort(ordersData);
        
        setOrders(ordersData);
        setIsLoading(false);
        return; // Exit if successful
      } catch (axiosErr) {
        console.warn('Failed with direct API call, trying fallback...', axiosErr);
      }

      // Approach 3: Fallback to retry endpoint with cache-busting
      const retryResponse = await orderService.retryFetchOrders();
      let ordersData = retryResponse as RawOrderData[];
      
      // Apply filters and sorting
      ordersData = applyFiltersAndSort(ordersData);
      
      setOrders(ordersData);
    } catch (err: any) {
      console.error('All order fetching methods failed:', err);
      setError('Failed to load your orders');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = (data: RawOrderData[]): RawOrderData[] => {
    let filteredData = [...data];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(order => 
        order.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    // Apply search query if exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredData = filteredData.filter(order => {
        // Search in order ID
        if (order.id?.toLowerCase().includes(query) || 
            order._id?.toLowerCase().includes(query) ||
            order.orderNumber?.toLowerCase().includes(query)) {
          return true;
        }
        
        // Search in order items if available
        if (order.items?.some(item => 
          item.name?.toLowerCase().includes(query) ||
          item.specialInstructions?.toLowerCase().includes(query)
        )) {
          return true;
        }
        
        return false;
      });
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'date_asc':
        filteredData.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateA.getTime() - dateB.getTime();
        });
        break;
      case 'date_desc':
        filteredData.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case 'total_asc':
        filteredData.sort((a, b) => {
          const totalA = a.total || a.totalAmount || 0;
          const totalB = b.total || b.totalAmount || 0;
          return totalA - totalB;
        });
        break;
      case 'total_desc':
        filteredData.sort((a, b) => {
          const totalA = a.total || a.totalAmount || 0;
          const totalB = b.total || b.totalAmount || 0;
          return totalB - totalA;
        });
        break;
      default:
        // Default to newest first
        filteredData.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });
    }
    
    // Apply limit if specified
    if (limit && limit > 0) {
      filteredData = filteredData.slice(0, limit);
    }
    
    return filteredData;
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'preparing':
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="bg-white shadow-sm rounded-lg p-6 flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="bg-white shadow-sm rounded-lg p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {allowFiltering && (
        <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search bar */}
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
            
            {/* Filter and sort options */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <select
                value={statusFilter}
                onChange={handleStatusChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="total_desc">Highest Total</option>
                <option value="total_asc">Lowest Total</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {orders.length > 0 ? (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order, index) => (
                  <tr key={order.id || order._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-md mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {order.orderNumber || 
                            (order.id ? order.id.substring(0, 8) : 
                              (order._id ? order._id.substring(0, 8) : `Order-${index + 1}`))}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt || order.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.items && order.items.length > 0 ? (
                        <span>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      €{typeof order.total === 'number' ? order.total.toFixed(2) : 
                        (typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : '0.00')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/order-confirmation/${order.id || order._id || `order-${Date.now()}-${index}`}`} className="text-indigo-600 hover:text-indigo-900 mr-3">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-gray-500 mb-4">No orders found matching your criteria.</p>
          <Link to="/menu-items">
            <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors">
              Place an Order
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default OrdersList; 