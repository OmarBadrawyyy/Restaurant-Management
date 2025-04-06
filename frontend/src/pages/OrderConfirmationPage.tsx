import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

// Types
interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  deliveryAddress?: string;
  deliveryOption: 'pickup' | 'delivery';
  paymentMethod: string;
  specialInstructions?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

// Add custom mapping for possible response formats
const mapOrderData = (responseData: any): Order => {
  // Check if the API returns expected format
  if (responseData && responseData.items && Array.isArray(responseData.items)) {
    return responseData as Order;
  }
  
  // Handle case where data might be in a nested structure
  if (responseData && responseData.data && responseData.data.items) {
    return responseData.data as Order;
  }
  
  // Create a default order structure with empty arrays where needed
  const defaultOrder: Order = {
    id: responseData?.id || responseData?.orderId || 'N/A',
    items: [],
    deliveryOption: responseData?.deliveryType || responseData?.isDelivery ? 'delivery' : 'pickup',
    paymentMethod: responseData?.paymentMethod || 'cash',
    specialInstructions: responseData?.specialInstructions || '',
    totalAmount: responseData?.total || responseData?.totalPrice || 0,
    status: responseData?.status || 'pending',
    createdAt: responseData?.createdAt || new Date().toISOString()
  };
  
  // Try to extract items from various possible locations
  const possibleItemsArray = 
    responseData?.items || 
    responseData?.orderItems ||
    responseData?.data?.items || 
    responseData?.order?.items || 
    [];
  
  // Map items to expected format if found
  if (Array.isArray(possibleItemsArray)) {
    defaultOrder.items = possibleItemsArray.map((item: any) => ({
      itemId: item.menuItemId || item.itemId || item.id || 'unknown',
      name: item.name || 'Unknown Item',
      price: typeof item.price === 'number' ? item.price : 0,
      quantity: item.quantity || 1
    }));
  }
  
  // Handle delivery address
  if (responseData?.deliveryAddress) {
    if (typeof responseData.deliveryAddress === 'string') {
      defaultOrder.deliveryAddress = responseData.deliveryAddress;
    } else if (typeof responseData.deliveryAddress === 'object') {
      // Convert object to formatted string
      const addr = responseData.deliveryAddress;
      defaultOrder.deliveryAddress = `${addr.street || ''}\n${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`;
    }
  }
  
  return defaultOrder;
};

// Add a constant tax rate to use for calculations
const TAX_RATE = 0.1; // 10% tax rate

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        console.log('Fetching order with ID:', orderId);
        const response = await axios.get(`/api/orders/${orderId}`);
        console.log('Raw API response:', response.data);
        
        // Use the mapping function to normalize the data
        const mappedOrder = mapOrderData(response.data);
        console.log('Mapped order data:', mappedOrder);
        
        setOrder(mappedOrder);
      } catch (err) {
        console.error('Failed to fetch order', err);
        setError('Failed to load order details');
        toast.error('Failed to load order details');
        
        // If we have a generated orderId (like order-timestamp), create a placeholder order
        if (orderId?.startsWith('order-')) {
          console.log('Creating placeholder order for generated ID');
          const placeholderOrder: Order = {
            id: orderId,
            items: [],
            deliveryOption: 'pickup',
            paymentMethod: 'cash',
            totalAmount: 0,
            status: 'pending',
            createdAt: new Date().toISOString()
          };
          setOrder(placeholderOrder);
          setError('');
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (orderId) {
      fetchOrder();
    } else {
      setError('Order ID not found');
      setLoading(false);
    }
  }, [orderId]);
  
  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }
  
  if (error || !order) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-xl shadow-sm p-8 max-w-lg mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'We could not find the order details you are looking for.'}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <div className="text-center mb-8">
              <div className="mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Confirmed!</h1>
              <p className="text-gray-600">Thank you for your order. Your order has been received and is being processed.</p>
            </div>
            
            <div className="border-t border-b border-gray-200 py-4 mb-6">
              <div className="flex flex-wrap -mx-2">
                <div className="w-full sm:w-1/2 px-2 mb-4 sm:mb-0">
                  <h2 className="text-gray-500 text-sm mb-1">Order Number</h2>
                  <p className="font-medium">{order.id}</p>
                </div>
                <div className="w-full sm:w-1/2 px-2">
                  <h2 className="text-gray-500 text-sm mb-1">Date Placed</h2>
                  <p className="font-medium">{formatDate(order.createdAt)}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Details</h2>
              
              <div className="overflow-hidden rounded-lg border border-gray-200 mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order && order.items && Array.isArray(order.items) ? (
                      order.items.map((item, index) => (
                        <tr key={`${item.itemId || index}-${index}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name || 'Unknown Item'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{item.quantity || 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                {/* Calculate and store subtotal in a variable for reuse */}
                {(() => {
                  const subtotal = order && order.items && Array.isArray(order.items) 
                    ? order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
                    : 0;
                  
                  const deliveryFee = order.deliveryOption === 'delivery' ? 5 : 0;
                  const tax = subtotal * TAX_RATE;
                  const calculatedTotal = subtotal + tax + deliveryFee;
                  
                  return (
                    <>
                      <div className="flex justify-between w-48">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">${subtotal.toFixed(2)}</span>
                      </div>
                      
                      {order.deliveryOption === 'delivery' && (
                        <div className="flex justify-between w-48">
                          <span className="text-gray-600">Delivery Fee</span>
                          <span className="font-medium">$5.00</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between w-48">
                        <span className="text-gray-600">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                        <span className="font-medium">${tax.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between font-bold w-48 pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span>${calculatedTotal.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Delivery Method</h3>
                <p className="text-gray-600 capitalize">{order.deliveryOption}</p>
                
                {order.deliveryOption === 'delivery' && order.deliveryAddress && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Delivery Address</h4>
                    <p className="text-gray-600 whitespace-pre-line">{order.deliveryAddress}</p>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Method</h3>
                <p className="text-gray-600 capitalize">
                  {order.paymentMethod === 'credit_card' ? 'Credit Card' : 'Cash on Delivery/Pickup'}
                </p>
              </div>
            </div>
            
            {order.specialInstructions && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Special Instructions</h3>
                <p className="text-gray-600 whitespace-pre-line">{order.specialInstructions}</p>
              </div>
            )}
            
            <div className="text-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
          
          <div className="text-center text-gray-500 text-sm">
            <p>A confirmation email has been sent to your email address.</p>
            <p className="mt-1">If you have any questions, please contact our customer support.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage; 