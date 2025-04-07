import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import orderService, { Order } from '../services/orderService';
import axios from 'axios';
import { format } from 'date-fns';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

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
  items?: OrderItem[];
  [key: string]: any; // Allow any other properties
}

interface RecentOrdersProps {
  limit?: number;
  showViewAll?: boolean;
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ limit = 5, showViewAll = true }) => {
  const [orders, setOrders] = useState<RawOrderData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RawOrderData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Try multiple approaches to get orders
        try {
          // Approach 1: Use orderService
          const response = await orderService.getUserOrders({ limit });
          setOrders(response as RawOrderData[]);
          setIsLoading(false);
          return; // Exit if successful
        } catch (serviceErr) {
          console.warn('Failed to fetch orders using orderService, trying direct API call...', serviceErr);
        }

        // Approach 2: Use direct axios call
        try {
          const directResponse = await axios.get('/api/orders', { 
            params: { limit },
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
          
          setOrders(ordersData);
          setIsLoading(false);
          return; // Exit if successful
        } catch (axiosErr) {
          console.warn('Failed with direct API call, trying fallback...', axiosErr);
        }

        // Approach 3: Fallback to retry endpoint with cache-busting
        const retryResponse = await orderService.retryFetchOrders({ limit });
        setOrders(retryResponse as RawOrderData[]);
      } catch (err: any) {
        console.error('All order fetching methods failed:', err);
        setError('Failed to load recent orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [limit]);

  const handlePlaceOrder = () => {
    navigate('/menu-items');
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

  const viewOrderDetails = (order: RawOrderData) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const closeModal = () => {
    setShowDetails(false);
    setSelectedOrder(null);
  };

  const formatDateTime = (dateString: string | Date | number): string => {
    const date = typeof dateString === 'number' ? new Date(dateString) : new Date(dateString);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Orders</h2>
          {showViewAll && (
            <Link to="/customer?tab=orders" className="text-yellow-600 hover:text-yellow-700 text-sm font-medium">
              View All
            </Link>
          )}
        </div>
        <div className="bg-white shadow-sm rounded-lg p-6 flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Orders</h2>
          {showViewAll && (
            <Link to="/customer?tab=orders" className="text-yellow-600 hover:text-yellow-700 text-sm font-medium">
              View All
            </Link>
          )}
        </div>
        <div className="bg-white shadow-sm rounded-lg p-6 text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={handlePlaceOrder}
            className="mt-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
          >
            Place an Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Recent Orders</h2>
        <div className="flex space-x-4 items-center">
          {showViewAll && orders.length > 0 && (
            <Link to="/customer?tab=orders" className="text-yellow-600 hover:text-yellow-700 text-sm font-medium flex items-center">
              View All
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
          <Link to="/menu-items" className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Order
          </Link>
        </div>
      </div>
      
      {orders.length > 0 ? (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                    {formatDateTime(order.createdAt || order.created_at || Date.now())}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    €{typeof order.total === 'number' ? order.total.toFixed(2) : 
                      (typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : '0.00')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => viewOrderDetails(order)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-gray-500 mb-4">No recent orders found.</p>
          <button 
            onClick={handlePlaceOrder}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
          >
            Place an Order
          </button>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl mx-4 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                Order #{selectedOrder.orderNumber}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Order Date:</p>
                  <p className="font-medium">{formatDateTime(selectedOrder.createdAt || selectedOrder.created_at || Date.now())}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status:</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </span>
                </div>
              </div>
              
              {/* Order Items */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <h4 className="text-base font-medium text-gray-700 mb-3">Order Items</h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-gray-100 text-sm font-medium text-gray-500">
                    <div className="col-span-6">Item</div>
                    <div className="col-span-2 text-center">Quantity</div>
                    <div className="col-span-2 text-center">Price</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-1 px-4 py-3">
                        <div className="col-span-6">
                          <p className="font-medium">{item.name}</p>
                          {item.specialInstructions && (
                            <p className="text-sm text-gray-500 mt-1">{item.specialInstructions}</p>
                          )}
                        </div>
                        <div className="col-span-2 text-center self-center">
                          {item.quantity}
                        </div>
                        <div className="col-span-2 text-center self-center">
                          €{(item.price ?? 0).toFixed(2)}
                        </div>
                        <div className="col-span-2 text-right self-center font-medium">
                          €{((item.price ?? 0) * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between items-center py-2 font-medium">
                      <span>Total:</span>
                      <span>€{(selectedOrder.total || selectedOrder.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentOrders; 