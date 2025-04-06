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
  
  // Local state for special instructions
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Calculate totals
  const subtotal = getSubtotal();
  const tax = subtotal * 0.08; // 8% tax rate
  const total = subtotal + tax;
  
  // Cart functions
  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    updateQuantity(itemId, newQuantity);
  };
  
  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };
  
  const clearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCartItems();
      setSpecialInstructions('');
    }
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
                Browse Menu
              </button>
              <button
                onClick={reloadCart}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Reload Cart
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-100 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">Cart Items ({cart.length})</h2>
                  <button
                    onClick={clearCart}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Clear Cart
                  </button>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {cart.map(item => (
                    <div key={item.itemId} className="p-6 flex flex-col sm:flex-row sm:items-center">
                      <div className="flex-grow mb-4 sm:mb-0">
                        <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                        <p className="text-gray-600">${item.price.toFixed(2)} each</p>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="flex items-center mr-6">
                          <button
                            onClick={() => updateItemQuantity(item.itemId, item.quantity - 1)}
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
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Special Instructions */}
              <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Special Instructions</h3>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Add any special instructions or requests here..."
                  className="w-full h-24 p-3 border rounded-lg focus:ring-black focus:border-black"
                ></textarea>
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
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
                  </div>
                </div>
                
                <button
                  onClick={proceedToCheckout}
                  className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-900 flex items-center justify-center"
                >
                  Proceed to Checkout
                </button>
                
                <p className="text-gray-500 text-sm text-center mt-4">
                  Delivery and discounts will be calculated at checkout
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage; 