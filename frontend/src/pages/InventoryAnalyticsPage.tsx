import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import analyticsService, { InventoryAnalytics } from '../services/analyticsService';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Add error display component with retry functionality
const ErrorDisplay: React.FC<{ 
  error: any; 
  onRetry: () => void;
}> = ({ error, onRetry }) => {
  // Determine if this is a timeout error
  const isTimeout = error?.response?.status === 504 || 
                    (error?.response?.data?.error === 'TIMEOUT_ERROR');
  
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow" role="alert">
      <h3 className="font-bold text-lg mb-2">Error Loading Data</h3>
      <p className="mb-3">{error?.response?.data?.message || error?.message || 'Failed to load inventory data. Please try again later.'}</p>
      
      <button 
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      >
        Try Again
      </button>
      
      {isTimeout && (
        <p className="text-sm mt-3 text-red-600">
          Our system is experiencing high load. Please try again in a few moments.
        </p>
      )}
    </div>
  );
};

const InventoryAnalyticsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [inventoryData, setInventoryData] = useState<InventoryAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Use useEffect with a retryCount dependency to enable retrying
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Add a small delay if this is a retry to prevent hammering the server
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const data = await analyticsService.getInventoryAnalytics();
        setInventoryData(data);
      } catch (err: any) {
        console.error('Error fetching inventory analytics:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventoryData();
  }, [retryCount]);

  // Handler for retry button
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You don't have permission to access the inventory analytics.</p>
        <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Return to Home
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Inventory Analytics</h1>
          <p className="text-gray-600">Analyze inventory levels and values</p>
        </div>
        
        <Link 
          to="/admin/analytics" 
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Back to Dashboard
        </Link>
      </div>
      
      {isLoading ? (
        <LoadingSpinner message="Loading inventory data..." />
      ) : error ? (
        <ErrorDisplay error={error} onRetry={handleRetry} />
      ) : inventoryData ? (
        <>
          {/* Inventory Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Items</h2>
              <p className="text-3xl font-bold">{inventoryData.summary.totalItems}</p>
              <p className="text-sm text-gray-500 mt-1">In active inventory</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Value</h2>
              <p className="text-3xl font-bold">${inventoryData.summary.totalValue.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">Estimated value</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Low Stock Items</h2>
              <p className="text-3xl font-bold text-yellow-600">{inventoryData.summary.lowStockCount}</p>
              <p className="text-sm text-gray-500 mt-1">Below minimum level</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Reorder Items</h2>
              <p className="text-3xl font-bold text-red-600">{inventoryData.summary.reorderCount}</p>
              <p className="text-sm text-gray-500 mt-1">Need reordering</p>
            </div>
          </div>
          
          {/* Low Stock Items */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Low Stock Items</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min Stock Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reorder Point
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost Per Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryData.lowStockItems && inventoryData.lowStockItems.length > 0 ? (
                      inventoryData.lowStockItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                            {item.currentStock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.minStockLevel}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.reorderPoint}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.costPerUnit.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No low stock items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Value by Category */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Inventory Value by Category</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryData.valueByCategory && inventoryData.valueByCategory.length > 0 ? (
                      inventoryData.valueByCategory.map((category, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {category._id || 'Uncategorized'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category.totalItems}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${category.totalValue.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${category.averageValue.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                          No category data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p>No inventory data available.</p>
        </div>
      )}
    </div>
  );
};

export default InventoryAnalyticsPage; 