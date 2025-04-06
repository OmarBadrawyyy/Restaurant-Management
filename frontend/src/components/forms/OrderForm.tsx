import React, { useState, useEffect } from 'react';
import { useMenuItems } from '../../hooks/useMenu';
import { useOrders } from '../../hooks/useOrders';
import useForm from '../../utils/useForm';
import orderService, { Order, CreateOrderRequest, OrderItem, PaymentMethod } from '../../services/orderService';
import validator from '../../utils/validator';
import PaymentFormModal from '../PaymentFormModal';
import paymentService, { CardInfo } from '../../services/paymentService';
import { fetchCsrfToken } from '../../services/axiosCsrfConfig';

interface OrderFormProps {
  initialTableNumber?: number;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  onSuccess?: (order: Order) => void;
  onCancel?: () => void;
}

interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

interface FormValues {
  tableNumber: number | '';
  isDelivery: boolean;
  deliveryAddress: DeliveryAddress;
  paymentMethod: PaymentMethod | '';
  specialInstructions: string;
  customerName: string;
  email: string;
  contactPhone: string;
}

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions: string;
}

const OrderForm: React.FC<OrderFormProps> = ({
  initialTableNumber = '',
  customerInfo = { name: '', email: '', phone: '' },
  onSuccess,
  onCancel,
}) => {
  // Get menu items
  const { menuItems, isLoading: isLoadingMenuItems } = useMenuItems();
  
  // Order mutation hooks
  const { createOrder, isCreatingOrder, createOrderError } = useOrders();
  
  // State for selected items
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  
  // State for payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<CreateOrderRequest | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Add state for the cash payment process
  const [isCashProcessing, setIsCashProcessing] = useState(false);
  
  // Add state for debugging info
  const [apiErrorDetails, setApiErrorDetails] = useState<string | null>(null);
  
  // Handle form values and validation
  const initialValues: FormValues = {
    tableNumber: typeof initialTableNumber === 'number' ? initialTableNumber : '',
    isDelivery: false,
    deliveryAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    paymentMethod: '',
    specialInstructions: '',
    customerName: customerInfo.name || '',
    email: customerInfo.email || '',
    contactPhone: customerInfo.phone || ''
  };
  
  const { values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue } = useForm<FormValues>({
    initialValues,
    onSubmit: async (formValues) => {
      if (selectedItems.length === 0) {
        return;
      }
      
      // Prepare order data with actual customer information
      const orderData: CreateOrderRequest = {
        customerName: formValues.customerName || 'Guest',
        contactPhone: formValues.contactPhone || '000-000-0000',
        email: formValues.email || 'guest@example.com',
        items: selectedItems.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
          name: item.name,
          price: item.price
        })),
        specialInstructions: formValues.specialInstructions,
        isDelivery: formValues.isDelivery,
        paymentMethod: formValues.paymentMethod as PaymentMethod,
      };
      
      // Add table number if not delivery
      if (!formValues.isDelivery && formValues.tableNumber !== '') {
        orderData.tableNumber = Number(formValues.tableNumber);
      }
      
      // Add delivery address if delivery
      if (formValues.isDelivery) {
        orderData.deliveryAddress = formValues.deliveryAddress;
      }
      
      console.log('Preparing to submit order:', JSON.stringify(orderData));
      
      // If payment method is cash, use direct service call with enhanced CSRF handling
      if (formValues.paymentMethod === 'cash') {
        try {
          setIsCashProcessing(true);
          setApiErrorDetails(null);
          
          // Force fetch a fresh CSRF token before proceeding
          await fetchCsrfToken();
          
          // Use the enhanced orderService directly for cash payments
          const result = await orderService.createOrder(orderData);
          
          if (onSuccess) {
            onSuccess(result);
          }
          setSelectedItems([]);
          setPendingOrderData(null);
          setPaymentError(null);
        } catch (error: any) {
          console.error('Cash payment processing error:', error);
          
          // Capture and display more detailed error information
          let errorMessage = 'Error processing cash payment';
          if (error.response) {
            errorMessage = error.response.data?.message || `Server error (${error.response.status})`;
            setApiErrorDetails(JSON.stringify(error.response.data || {}));
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          setPaymentError(errorMessage);
        } finally {
          setIsCashProcessing(false);
        }
        return;
      }
      
      // If payment method is credit/debit card, show payment modal
      if (formValues.paymentMethod === 'credit_card' || formValues.paymentMethod === 'debit_card') {
        setPendingOrderData(orderData);
        setShowPaymentModal(true);
        return;
      }
      
      // For other payment methods, proceed directly with existing hook
      createOrderWithData(orderData);
    },
    validate: (formValues) => {
      const formErrors: Partial<Record<keyof FormValues, string>> = {};
      
      // Validate customer information
      if (!formValues.customerName) {
        formErrors.customerName = 'Name is required';
      }
      
      if (!formValues.email) {
        formErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formValues.email)) {
        formErrors.email = 'Email is invalid';
      }
      
      if (!formValues.contactPhone) {
        formErrors.contactPhone = 'Phone number is required';
      }
      
      // Validate table number if not delivery
      if (!formValues.isDelivery) {
        if (formValues.tableNumber === '') {
          formErrors.tableNumber = 'Table number is required';
        } else if (Number(formValues.tableNumber) <= 0) {
          formErrors.tableNumber = 'Table number must be positive';
        }
      }
      
      // Validate delivery address if delivery
      if (formValues.isDelivery) {
        if (!formValues.deliveryAddress.street) {
          formErrors.deliveryAddress = 'Street address is required';
        } else if (!formValues.deliveryAddress.city) {
          formErrors.deliveryAddress = 'City is required';
        } else if (!formValues.deliveryAddress.state) {
          formErrors.deliveryAddress = 'State is required';
        } else if (!formValues.deliveryAddress.zipCode) {
          formErrors.deliveryAddress = 'ZIP code is required';
        }
      }
      
      // Validate payment method
      if (!formValues.paymentMethod) {
        formErrors.paymentMethod = 'Payment method is required';
      }
      
      return formErrors;
    },
  });
  
  // Effect to update form values when customerInfo changes
  useEffect(() => {
    if (customerInfo.name) setFieldValue('customerName', customerInfo.name);
    if (customerInfo.email) setFieldValue('email', customerInfo.email);
    if (customerInfo.phone) setFieldValue('contactPhone', customerInfo.phone);
  }, [customerInfo, setFieldValue]);
  
  // Function to handle card payment submission
  const handleCardPayment = async (cardInfo: CardInfo) => {
    if (!pendingOrderData) return;
    
    try {
      // Calculate total price 
      const totalAmount = totalPrice;
      
      // Process the card payment
      const paymentResult = await paymentService.processCreditCardPayment(
        totalAmount,
        cardInfo,
        'pending' // This will be replaced with actual order ID after order creation
      );
      
      if (paymentResult.success) {
        // Payment successful, create the order
        createOrderWithData(pendingOrderData);
        setShowPaymentModal(false);
      } else {
        // Payment failed
        setPaymentError(paymentResult.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setPaymentError('An unexpected error occurred during payment processing');
    }
  };
  
  // Helper function to create order
  const createOrderWithData = (orderData: CreateOrderRequest) => {
    createOrder(orderData, {
      onSuccess: (newOrder) => {
        if (onSuccess) {
          onSuccess(newOrder as Order);
        }
        setSelectedItems([]);
        setPendingOrderData(null);
        setPaymentError(null);
      }
    });
  };
  
  // Handle adding a menu item to the order
  const handleAddItem = (menuItemId: string) => {
    const menuItem = menuItems?.find((item) => item.id === menuItemId);
    if (!menuItem) return;
    
    // Check if item already exists
    const existingItemIndex = selectedItems.findIndex((item) => item.id === menuItemId);
    
    if (existingItemIndex >= 0) {
      // Increment quantity if already added
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex].quantity += 1;
      setSelectedItems(updatedItems);
    } else {
      // Add new item
      const newItem: SelectedItem = {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        specialInstructions: '',
      };
      setSelectedItems([...selectedItems, newItem]);
    }
  };
  
  // Handle removing a menu item from the order
  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };
  
  // Handle quantity change
  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const updatedItems = [...selectedItems];
    updatedItems[index].quantity = quantity;
    setSelectedItems(updatedItems);
  };
  
  // Handle special instructions change
  const handleItemInstructionsChange = (index: number, instructions: string) => {
    const updatedItems = [...selectedItems];
    updatedItems[index].specialInstructions = instructions;
    setSelectedItems(updatedItems);
  };
  
  // Calculate total price
  const totalPrice = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  // Group menu items by category for display
  const groupedMenuItems = menuItems?.reduce((groups: Record<string, typeof menuItems>, item) => {
    const category = typeof item.category === 'string' 
      ? item.category 
      : item.category?.name || 'Uncategorized';
    
    if (!groups[category]) {
      groups[category] = [];
    }
    
    groups[category].push(item);
    return groups;
  }, {});
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Create New Order</h2>
      
      {createOrderError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          Error creating order: {createOrderError instanceof Error ? createOrderError.message : 'Unknown error'}
        </div>
      )}
      
      {paymentError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          Payment Error: {paymentError}
          {apiErrorDetails && (
            <details className="mt-2 text-xs">
              <summary>Technical details</summary>
              <pre className="whitespace-pre-wrap">{apiErrorDetails}</pre>
            </details>
          )}
        </div>
      )}
      
      {/* Payment Form Modal */}
      <PaymentFormModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handleCardPayment}
        amount={totalPrice}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Menu Items Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Menu Items</h3>
          
          {isLoadingMenuItems ? (
            <div className="p-4 text-center">Loading menu items...</div>
          ) : !menuItems || menuItems.length === 0 ? (
            <div className="p-4 text-center">No menu items available</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMenuItems || {}).map(([category, items]) => (
                <div key={category} className="border rounded-md p-4">
                  <h4 className="font-medium text-lg mb-2">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((item) => (
                      <div 
                        key={item.id} 
                        className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleAddItem(item.id)}
                      >
                        <div className="flex justify-between">
                          <div className="font-medium">{item.name}</div>
                          <div>${item.price.toFixed(2)}</div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {item.description && item.description.length > 60
                            ? `${item.description.substring(0, 60)}...`
                            : item.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Order Details */}
        <div>
          <form onSubmit={handleSubmit}>
            <h3 className="text-lg font-semibold mb-4">Order Details</h3>
            
            {/* Customer Information */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Customer Information</h4>
              <div className="space-y-4">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    name="customerName"
                    value={values.customerName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`block w-full rounded-md ${
                      touched.customerName && errors.customerName ? 'border-red-300' : 'border-gray-300'
                    } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                  />
                  {touched.customerName && errors.customerName && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`block w-full rounded-md ${
                      touched.email && errors.email ? 'border-red-300' : 'border-gray-300'
                    } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                  />
                  {touched.email && errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="contactPhone"
                    name="contactPhone"
                    value={values.contactPhone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`block w-full rounded-md ${
                      touched.contactPhone && errors.contactPhone ? 'border-red-300' : 'border-gray-300'
                    } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                  />
                  {touched.contactPhone && errors.contactPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.contactPhone}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Selected Items */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Selected Items</h4>
              {selectedItems.length === 0 ? (
                <div className="text-gray-500 p-4 border rounded text-center">
                  No items selected. Click on menu items to add them to your order.
                </div>
              ) : (
                <div className="border rounded-md divide-y">
                  {selectedItems.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{item.name}</div>
                        <div>${(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center">
                          <button
                            type="button"
                            className="bg-gray-200 rounded-l px-2 py-1"
                            onClick={() => handleQuantityChange(index, item.quantity - 1)}
                          >
                            -
                          </button>
                          <span className="px-4 py-1 border-t border-b">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="bg-gray-200 rounded-r px-2 py-1"
                            onClick={() => handleQuantityChange(index, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleRemoveItem(index)}
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Special instructions for this item"
                          value={item.specialInstructions}
                          onChange={(e) => handleItemInstructionsChange(index, e.target.value)}
                          className="w-full p-2 border rounded text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedItems.length > 0 && (
                <div className="mt-3 text-right font-bold">
                  Total: ${totalPrice.toFixed(2)}
                </div>
              )}
            </div>
            
            {/* Delivery Options */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Delivery Options</h4>
              
              <div className="flex items-center space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isDelivery"
                    checked={!values.isDelivery}
                    onChange={() => setFieldValue('isDelivery', false)}
                    className="mr-2"
                  />
                  Dine-in
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isDelivery"
                    checked={values.isDelivery}
                    onChange={() => setFieldValue('isDelivery', true)}
                    className="mr-2"
                  />
                  Delivery
                </label>
              </div>
              
              {/* Table Number (for dine-in) */}
              {!values.isDelivery && (
                <div className="mb-4">
                  <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Table Number
                  </label>
                  <input
                    type="number"
                    id="tableNumber"
                    name="tableNumber"
                    value={values.tableNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    min="1"
                    className={`block w-full rounded-md ${
                      touched.tableNumber && errors.tableNumber ? 'border-red-300' : 'border-gray-300'
                    } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                  />
                  {touched.tableNumber && errors.tableNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.tableNumber}</p>
                  )}
                </div>
              )}
              
              {/* Delivery Address */}
              {values.isDelivery && (
                <div className="border rounded-md p-4 mb-4">
                  <h5 className="font-medium mb-3">Delivery Address</h5>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        id="street"
                        name="deliveryAddress.street"
                        value={values.deliveryAddress.street}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      {touched.deliveryAddress && errors.deliveryAddress === 'Street address is required' && (
                        <p className="mt-1 text-sm text-red-600">Street address is required</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="deliveryAddress.city"
                          value={values.deliveryAddress.city}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        {touched.deliveryAddress && errors.deliveryAddress === 'City is required' && (
                          <p className="mt-1 text-sm text-red-600">City is required</p>
                        )}
                      </div>
                      
                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          id="state"
                          name="deliveryAddress.state"
                          value={values.deliveryAddress.state}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        {touched.deliveryAddress && errors.deliveryAddress === 'State is required' && (
                          <p className="mt-1 text-sm text-red-600">State is required</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        id="zipCode"
                        name="deliveryAddress.zipCode"
                        value={values.deliveryAddress.zipCode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      {touched.deliveryAddress && errors.deliveryAddress === 'ZIP code is required' && (
                        <p className="mt-1 text-sm text-red-600">ZIP code is required</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Payment Method */}
            <div className="mb-6">
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={values.paymentMethod}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full rounded-md ${
                  touched.paymentMethod && errors.paymentMethod ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
              >
                <option value="">Select payment method</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="mobile_payment">Mobile Payment</option>
              </select>
              {touched.paymentMethod && errors.paymentMethod && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>
              )}
            </div>
            
            {/* Special Instructions */}
            <div className="mb-6">
              <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions (Optional)
              </label>
              <textarea
                id="specialInstructions"
                name="specialInstructions"
                value={values.specialInstructions}
                onChange={handleChange}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              )}
              
              <button
                type="submit"
                disabled={isCreatingOrder || isCashProcessing || selectedItems.length === 0}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isCreatingOrder || isCashProcessing || selectedItems.length === 0
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isCreatingOrder || isCashProcessing ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrderForm; 