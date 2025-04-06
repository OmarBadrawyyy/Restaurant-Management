import React, { useState } from 'react';
import { useUserOrders, useOrders, ORDER_STATUSES } from '../hooks/useOrders';
import { OrderStatus, Order, OrderItem } from '../services/orderService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import OrderTracker from './OrderTracker';

const OrderList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showTracker, setShowTracker] = useState(false);

  // Get user orders
  const { data: orders = [], isLoading, error, refetch } = useUserOrders(
    statusFilter || undefined
  );

  // Order mutations
  const { cancelOrder, isCancellingOrder, cancelOrderError } = useOrders();

  // Handle order cancellation
  const handleCancelOrder = (id: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelOrder(id, {
        onSuccess: () => {
          toast.success('Order cancelled successfully');
          refetch();
        },
        onError: (error: any) => {
          toast.error(`Failed to cancel order: ${error.message}`);
        }
      });
    }
  };

  // Format date
  const formatDateTime = (dateString: string | Date): string => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  // Get status badge class
  const getStatusBadgeClass = (status: OrderStatus): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-indigo-100 text-indigo-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-50 text-gray-800';
    }
  };

  // Open order details modal
  const viewOrderDetails = (order: Order) => {
    if (!order) return;
    
    // Transform the order data if needed
    const transformedOrder = {
      ...order,
      // Ensure all required fields are present
      items: order.items || [],
      total: order.total || order.totalPrice || 0,
      status: order.status || 'pending',
      paymentMethod: order.paymentMethod || 'cash',
      paymentStatus: order.paymentStatus || 'pending',
      isDelivery: order.isDelivery || false,
      createdAt: order.createdAt || new Date(),
      orderNumber: order.orderNumber || `ORD-${order.id?.slice(-6)}`
    };
    
    setSelectedOrder(transformedOrder);
    setShowDetails(true);
  };

  // Open order tracker
  const trackOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowTracker(true);
  };

  // Close modals
  const closeModals = () => {
    setShowDetails(false);
    setShowTracker(false);
    setSelectedOrder(null);
  };

  // Calculate if order can be cancelled
  const canCancelOrder = (order: Order): boolean => {
    return ['pending', 'confirmed'].includes(order.status);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Orders</h2>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Orders</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading your orders...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
          <p className="text-red-700">Failed to load orders. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <h3 className="text-xl font-medium text-gray-700">No orders found</h3>
          <p className="mt-2 text-gray-600">
            {statusFilter
              ? `You don't have any ${statusFilter} orders.`
              : "You haven't placed any orders yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order: Order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">
                      {order.items.map((item: OrderItem) => `${item.quantity}x ${item.name}`).join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    €{order.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Detail
                      </button>
                      
                      {['pending', 'confirmed', 'preparing', 'ready'].includes(order.status) && (
                        <button
                          onClick={() => trackOrder(order)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Track
                        </button>
                      )}
                      
                      {canCancelOrder(order) && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={isCancellingOrder}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-40" onClick={closeModals}></div>
          <div className="relative bg-white rounded-lg shadow-xl mx-4 max-w-4xl w-full max-h-screen overflow-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                Order #{selectedOrder.orderNumber}
              </h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Order Date:</p>
                  <p className="font-medium">{formatDateTime(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Order Type:</p>
                  <p className="font-medium">{selectedOrder.isDelivery ? 'Delivery' : 'Dine-in'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status:</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(selectedOrder.status)}`}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payment:</p>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {selectedOrder.paymentMethod.replace('_', ' ')
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </span>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedOrder.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                      selectedOrder.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedOrder.paymentStatus.charAt(0).toUpperCase() + selectedOrder.paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>
                
                {selectedOrder.isDelivery && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Delivery Address:</p>
                    <p className="font-medium">
                      {typeof selectedOrder.deliveryAddress === 'string' 
                        ? selectedOrder.deliveryAddress 
                        : selectedOrder.deliveryAddress 
                          ? `${selectedOrder.deliveryAddress.street}, ${selectedOrder.deliveryAddress.city}, ${selectedOrder.deliveryAddress.state} ${selectedOrder.deliveryAddress.zipCode}`
                          : 'No address provided'}
                    </p>
                  </div>
                )}
                
                {!selectedOrder.isDelivery && selectedOrder.tableNumber && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Table Number:</p>
                    <p className="font-medium">{selectedOrder.tableNumber}</p>
                  </div>
                )}
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
                    {selectedOrder.items.map((item: OrderItem, index) => (
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
                          €{item.price.toFixed(2)}
                        </div>
                        <div className="col-span-2 text-right self-center font-medium">
                          €{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Order Total */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between items-center py-2 font-medium">
                      <span>Total:</span>
                      <span>€{selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {canCancelOrder(selectedOrder) && (
                  <button
                    onClick={() => {
                      closeModals();
                      handleCancelOrder(selectedOrder.id);
                    }}
                    disabled={isCancellingOrder}
                    className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 disabled:opacity-50"
                  >
                    Cancel Order
                  </button>
                )}
                
                {['pending', 'confirmed', 'preparing', 'ready'].includes(selectedOrder.status) && (
                  <button
                    onClick={() => {
                      closeModals();
                      trackOrder(selectedOrder);
                    }}
                    className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200"
                  >
                    Track Order
                  </button>
                )}
                
                <button
                  onClick={closeModals}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Order Tracker Modal */}
      {showTracker && selectedOrder && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-40" onClick={closeModals}></div>
          <div className="relative bg-white rounded-lg shadow-xl mx-4 max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Track Order #{selectedOrder.orderNumber}
              </h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <OrderTracker orderId={selectedOrder.id} />
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeModals}
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

export default OrderList; 