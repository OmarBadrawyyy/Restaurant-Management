import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import OrderList from '../components/OrderList';
import OrderForm from '../components/forms/OrderForm';
import { Link } from 'react-router-dom';
import QuerySuspenseBoundary from '../components/QuerySuspenseBoundary';
import { Order } from '../services/orderService';

const OrderManagementInner: React.FC = () => {
  const { currentUser } = useAuth();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!currentUser) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Order Management</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6">
          <p className="text-yellow-700 font-medium mb-4">
            Please sign in to view your orders.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Handle successful order creation
  const handleOrderSuccess = (order: Order) => {
    setShowOrderForm(false);
    setRefreshTrigger(prev => prev + 1); // Trigger OrderList refresh
    window.scrollTo(0, 0);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Order Management</h2>
          <p className="text-gray-600">View your orders or place a new one</p>
        </div>
        
        {showOrderForm ? (
          <button
            onClick={() => setShowOrderForm(false)}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            View My Orders
          </button>
        ) : (
          <button
            onClick={() => setShowOrderForm(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Place New Order
          </button>
        )}
      </div>

      {showOrderForm ? (
        <OrderForm 
          onSuccess={handleOrderSuccess}
          onCancel={() => setShowOrderForm(false)}
        />
      ) : (
        <OrderList key={refreshTrigger} />
      )}
    </div>
  );
};

const OrderManagement: React.FC = () => {
  return (
    <QuerySuspenseBoundary loadingMessage="Loading your orders...">
      <OrderManagementInner />
    </QuerySuspenseBoundary>
  );
};

export default OrderManagement; 