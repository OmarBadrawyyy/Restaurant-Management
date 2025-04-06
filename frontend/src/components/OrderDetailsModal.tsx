import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, OrderItem } from '../services/orderService';
import { format, parseISO } from 'date-fns';

interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

// Status Badge component
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

// Format date helper function to handle both string and Date objects
const formatDateTime = (dateValue: string | Date): string => {
  if (dateValue instanceof Date) {
    return format(dateValue, 'MMM d, yyyy h:mm a');
  }
  return format(parseISO(dateValue), 'MMM d, yyyy h:mm a');
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, order, onClose, onStatusChange }) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
    }
  }, [order]);

  const handleStatusChange = async () => {
    if (!order || selectedStatus === '' || selectedStatus === order.status) return;
    
    try {
      setIsChangingStatus(true);
      await onStatusChange(order.id, selectedStatus as OrderStatus);
      setIsChangingStatus(false);
    } catch (error) {
      console.error('Failed to change status:', error);
      setIsChangingStatus(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        {/* Trick browser into centering modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* Modal panel */}
        <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Order #{order.orderNumber}
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

            <div className="mt-4">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Customer: <span className="font-medium text-gray-900">{order.customerName}</span></p>
                  {order.contactPhone && (
                    <p className="text-sm text-gray-500">Phone: <span className="font-medium text-gray-900">{order.contactPhone}</span></p>
                  )}
                  <p className="text-sm text-gray-500">Order Date: <span className="font-medium text-gray-900">{formatDateTime(order.createdAt)}</span></p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status: <OrderStatusBadge status={order.status} /></p>
                  {order.isDelivery && (
                    <p className="mt-1 text-sm text-gray-500">Delivery</p>
                  )}
                  {order.tableNumber && (
                    <p className="mt-1 text-sm text-gray-500">Table #{order.tableNumber}</p>
                  )}
                </div>
              </div>

              <div className="py-4 border-t border-gray-200">
                <h4 className="mb-2 text-sm font-medium text-gray-900">Order Items</h4>
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {order.items.map((item: OrderItem, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1 ml-3">
                        <h4 className="text-sm font-medium">{item.name} x {item.quantity}</h4>
                        {item.specialInstructions && (
                          <p className="text-xs italic text-gray-500">{item.specialInstructions}</p>
                        )}
                      </div>
                      <p className="text-sm text-gray-900">{formatCurrency((item.price ?? 0) * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="py-4 border-t border-gray-200">
                <div className="flex justify-between mb-2">
                  <p className="text-sm text-gray-500">Subtotal</p>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(order.subtotal)}</p>
                </div>
                <div className="flex justify-between mb-2">
                  <p className="text-sm text-gray-500">Tax</p>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(order.tax)}</p>
                </div>
                {order.tip && (
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-gray-500">Tip</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(order.tip)}</p>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <p className="text-sm text-gray-900">Total</p>
                  <p className="text-sm text-gray-900">{formatCurrency(order.total)}</p>
                </div>
              </div>

              {order.specialInstructions && (
                <div className="py-4 border-t border-gray-200">
                  <h4 className="mb-2 text-sm font-medium text-gray-900">Special Instructions</h4>
                  <p className="text-sm text-gray-600">{order.specialInstructions}</p>
                </div>
              )}

              {order.status !== 'cancelled' && order.status !== 'completed' && (
                <div className="py-4 border-t border-gray-200">
                  <h4 className="mb-2 text-sm font-medium text-gray-900">Update Status</h4>
                  <div className="flex items-center space-x-4">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                      className="block w-full py-2 pl-3 pr-10 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      disabled={isChangingStatus}
                    >
                      <option value="">Select Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                      <option value="delivered">Delivered</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={handleStatusChange}
                      disabled={isChangingStatus || selectedStatus === '' || selectedStatus === order.status}
                    >
                      {isChangingStatus ? (
                        <>
                          <svg className="w-4 h-4 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </>
                      ) : 'Update Status'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal; 