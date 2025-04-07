import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    cart, 
    updateQuantity, 
    removeItem, 
    clearCart: clearCartItems, 
    reloadCart, 
    getSubtotal 
  } = useCart();
  
<<<<<<< Updated upstream
  // Local state for special instructions
  const [specialInstructions, setSpecialInstructions] = useState('');

=======
  // Local state for special instructions and modal
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
>>>>>>> Stashed changes
  // Calculate totals
  const subtotal = getSubtotal();
  const tax = subtotal * 0.08; // 8% tax rate
  const total = subtotal + tax;
  
  // Cart functions
  const updateItemQuantity = (itemId: string, newQuantity: number) => {
<<<<<<< Updated upstream
    updateQuantity(itemId, newQuantity);
=======
    if (newQuantity > 0) {
      updateQuantity(itemId, newQuantity);
      toast.success('Cart updated', { 
        duration: 1500,
        position: 'bottom-center',
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    } else {
      handleRemoveItem(itemId);
    }
>>>>>>> Stashed changes
  };
  
  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
<<<<<<< Updated upstream
  };
  
  const clearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCartItems();
      setSpecialInstructions('');
    }
=======
    toast.success('Item removed from cart', { 
      duration: 1500,
      position: 'bottom-center',
      icon: '🗑️',
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px',
      },
    });
  };
  
  const openClearCartModal = () => {
    setIsConfirmModalOpen(true);
  };
  
  const clearCart = () => {
    clearCartItems();
    setSpecialInstructions('');
    setIsConfirmModalOpen(false);
    toast.success('Cart cleared', { 
      duration: 1500,
      position: 'bottom-center',
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px',
      },
    });
>>>>>>> Stashed changes
  };
  
  // Navigation
  const continueShopping = () => {
    navigate('/menu-items');
  };
  
  const proceedToCheckout = () => {
    // Save special instructions to localStorage
    localStorage.setItem('restaurant-order-instructions', specialInstructions);
    navigate('/checkout');
  };
  
<<<<<<< Updated upstream
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Your Cart</h1>
          <button
            onClick={continueShopping}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
        
        {cart.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven't added any items to your cart yet.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={continueShopping}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
=======
  // Confirmation Modal
  const ConfirmationModal = () => {
    if (!isConfirmModalOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={() => setIsConfirmModalOpen(false)}
        ></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden animate-fade-in-up">
          <div className="bg-blue-600 p-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Confirm Action
            </h3>
          </div>
          <div className="p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Clear your cart?</h4>
                <p className="text-gray-500 mt-1">
                  This will remove all items from your cart. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearCart}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Confirmation Modal */}
      <ConfirmationModal />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Go back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Your Cart</h1>
            </div>
            <button
              onClick={continueShopping}
              className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {cart.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12 text-center max-w-2xl mx-auto mt-8">
            <div className="bg-blue-50 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">Looks like you haven't added any items to your cart yet. Browse our menu to discover delicious dishes!</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={continueShopping}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
>>>>>>> Stashed changes
                Browse Menu
              </button>
              <button
                onClick={reloadCart}
<<<<<<< Updated upstream
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
=======
                className="px-8 py-3 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
>>>>>>> Stashed changes
                Reload Cart
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
<<<<<<< Updated upstream
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-100 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">Cart Items ({cart.length})</h2>
                  <button
                    onClick={clearCart}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
=======
              <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 bg-blue-50 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">
                    Your Order <span className="text-blue-600">({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
                  </h2>
                  <button
                    onClick={openClearCartModal}
                    className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
>>>>>>> Stashed changes
                    Clear Cart
                  </button>
                </div>
                
<<<<<<< Updated upstream
                <div className="divide-y divide-gray-200">
                  {cart.map(item => (
                    <div key={item.itemId} className="p-6 flex flex-col sm:flex-row sm:items-center">
                      <div className="flex-grow mb-4 sm:mb-0">
                        <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                        <p className="text-gray-600">${item.price.toFixed(2)} each</p>
=======
                <div className="divide-y divide-gray-100">
                  {cart.map(item => (
                    <div key={item.itemId} className="p-6 flex flex-col sm:flex-row sm:items-center hover:bg-gray-50 transition-colors">
                      <div className="flex-grow mb-4 sm:mb-0">
                        <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                        <p className="text-gray-500 text-sm">${item.price.toFixed(2)} each</p>
>>>>>>> Stashed changes
                      </div>
                      
                      <div className="flex items-center">
                        <div className="flex items-center mr-6">
                          <button
                            onClick={() => updateItemQuantity(item.itemId, item.quantity - 1)}
<<<<<<< Updated upstream
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800"
                          >
                            -
                          </button>
                          <span className="mx-3 font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(item.itemId, item.quantity + 1)}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800"
                          >
                            +
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                          <button
                            onClick={() => handleRemoveItem(item.itemId)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
=======
                            className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="mx-3 w-6 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(item.itemId, item.quantity + 1)}
                            className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="text-right min-w-[80px]">
                          <p className="font-bold text-blue-600">${(item.price * item.quantity).toFixed(2)}</p>
                          <button
                            onClick={() => handleRemoveItem(item.itemId)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium mt-1 flex items-center justify-end"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
>>>>>>> Stashed changes
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Special Instructions */}
<<<<<<< Updated upstream
              <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Special Instructions</h3>
=======
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Special Instructions
                </h3>
>>>>>>> Stashed changes
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Add any special instructions or requests here..."
<<<<<<< Updated upstream
                  className="w-full h-24 p-3 border rounded-lg focus:ring-black focus:border-black"
                ></textarea>
=======
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                ></textarea>
                <p className="text-gray-500 text-xs mt-2">Examples: Allergies, special preparation requests, delivery instructions</p>
>>>>>>> Stashed changes
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
<<<<<<< Updated upstream
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax (8%)</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold">${total.toFixed(2)}</span>
=======
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Order Summary
                </h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Tax (8%)</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4 mt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-blue-600">${total.toFixed(2)}</span>
>>>>>>> Stashed changes
                  </div>
                </div>
                
                <button
                  onClick={proceedToCheckout}
<<<<<<< Updated upstream
                  className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-900 flex items-center justify-center"
                >
                  Proceed to Checkout
                </button>
                
                <p className="text-gray-500 text-sm text-center mt-4">
                  Delivery and discounts will be calculated at checkout
                </p>
=======
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  Proceed to Checkout
                </button>
                
                <div className="mt-6 bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center text-sm text-gray-700 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Order Information</span>
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1 ml-7">
                    <li>• Delivery options available at checkout</li>
                    <li>• Any applicable discounts will be applied</li>
                    <li>• Estimated preparation time: 15-25 minutes</li>
                  </ul>
                </div>
>>>>>>> Stashed changes
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage; 