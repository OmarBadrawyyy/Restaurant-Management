import React, { useState } from 'react';
import { useInventoryItems, useInventoryOperations } from '../hooks/useInventory';
import QuerySuspenseBoundary from './QuerySuspenseBoundary';
import validator from '../utils/validator';
import { InventoryCategory, StockUpdateRequest } from '../services/inventoryService';

// The inner component that will be wrapped by QuerySuspenseBoundary
const InventoryManagementInner: React.FC = () => {
  const { inventoryItems, isLoading } = useInventoryItems();
  const { 
    createItem, 
    updateItem, 
    deleteItem, 
    updateStock, 
    isCreating, 
    isUpdating, 
    isDeleting, 
    isUpdatingStock 
  } = useInventoryOperations();

  // Form state for new item
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category: 'ingredient' as InventoryCategory,
    currentStock: 0,
    unit: '',
    minStockLevel: 0,
    reorderPoint: 10,
    costPerUnit: 0,
    supplier: '',
    location: ''
  });

  // Form state for stock update
  const [stockUpdateForm, setStockUpdateForm] = useState<{
    id: string;
    updateData: StockUpdateRequest;
  }>({
    id: '',
    updateData: {
      quantity: 0,
      type: 'restock',
      note: ''
    }
  });

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input changes for new item form
  const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let parsedValue: any = value;
    // Convert numeric values
    if (['currentStock', 'minStockLevel', 'reorderPoint', 'costPerUnit'].includes(name)) {
      parsedValue = parseFloat(value) || 0;
    }
    
    setNewItemForm(prev => ({ ...prev, [name]: parsedValue }));
    
    // Validate the field
    validateField(name, parsedValue);
  };

  // Handle input changes for stock update form
  const handleStockUpdateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'id') {
      setStockUpdateForm(prev => ({ ...prev, id: value }));
    } else {
      let parsedValue: any = value;
      if (name === 'quantity') {
        parsedValue = parseFloat(value) || 0;
      }
      
      setStockUpdateForm(prev => ({
        ...prev,
        updateData: { ...prev.updateData, [name]: parsedValue }
      }));
    }
  };

  // Validate a single field
  const validateField = (name: string, value: any) => {
    const rules: Record<string, any> = {
      name: { ...validator.VALIDATION_RULES.required, minLength: 2, maxLength: 50 },
      category: { ...validator.VALIDATION_RULES.required },
      currentStock: { ...validator.VALIDATION_RULES.positiveNumber },
      unit: { ...validator.VALIDATION_RULES.required },
      minStockLevel: { ...validator.VALIDATION_RULES.positiveNumber },
      reorderPoint: { ...validator.VALIDATION_RULES.positiveNumber },
      costPerUnit: { ...validator.VALIDATION_RULES.positiveNumber }
    };

    if (name in rules) {
      const error = validator.validateField(value, rules[name]);
      setErrors(prev => ({ ...prev, [name]: error || '' }));
      return !error;
    }
    return true;
  };

  // Validate entire form
  const validateForm = () => {
    const formData = newItemForm;
    const rules = {
      name: { ...validator.VALIDATION_RULES.required, minLength: 2, maxLength: 50 },
      category: { ...validator.VALIDATION_RULES.required },
      currentStock: { ...validator.VALIDATION_RULES.positiveNumber },
      unit: { ...validator.VALIDATION_RULES.required },
      minStockLevel: { ...validator.VALIDATION_RULES.positiveNumber },
      reorderPoint: { ...validator.VALIDATION_RULES.positiveNumber },
      costPerUnit: { ...validator.VALIDATION_RULES.positiveNumber }
    };

    const validationErrors = validator.validateForm(formData, rules);
    setErrors(validationErrors);
    return !validator.hasErrors(validationErrors);
  };

  // Handle new item form submission
  const handleNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      createItem(newItemForm);
      
      // Reset form on successful submission
      setNewItemForm({
        name: '',
        category: 'ingredient',
        currentStock: 0,
        unit: '',
        minStockLevel: 0,
        reorderPoint: 10,
        costPerUnit: 0,
        supplier: '',
        location: ''
      });
    }
  };

  // Handle stock update form submission
  const handleStockUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate stock update
    if (!stockUpdateForm.id) {
      setErrors(prev => ({ ...prev, id: 'Please select an item' }));
      return;
    }
    
    if (stockUpdateForm.updateData.quantity <= 0) {
      setErrors(prev => ({ ...prev, quantity: 'Quantity must be greater than 0' }));
      return;
    }
    
    // Submit stock update
    updateStock(stockUpdateForm);
    
    // Reset form
    setStockUpdateForm({
      id: '',
      updateData: {
        quantity: 0,
        type: 'restock',
        note: ''
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Inventory Management</h1>
      
      {/* Inventory Items List */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Inventory Items</h2>
        {isLoading ? (
          <p>Loading inventory...</p>
        ) : inventoryItems && inventoryItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Category</th>
                  <th className="py-2 px-4 border-b">Current Stock</th>
                  <th className="py-2 px-4 border-b">Unit</th>
                  <th className="py-2 px-4 border-b">Min Stock</th>
                  <th className="py-2 px-4 border-b">Reorder Point</th>
                  <th className="py-2 px-4 border-b">Cost/Unit</th>
                  <th className="py-2 px-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.map(item => (
                  <tr key={item.id} className={item.isLowStock ? 'bg-red-50' : ''}>
                    <td className="py-2 px-4 border-b">{item.name}</td>
                    <td className="py-2 px-4 border-b">{item.category}</td>
                    <td className="py-2 px-4 border-b">{item.currentStock} {item.unit}</td>
                    <td className="py-2 px-4 border-b">{item.unit}</td>
                    <td className="py-2 px-4 border-b">{item.minStockLevel}</td>
                    <td className="py-2 px-4 border-b">{item.reorderPoint}</td>
                    <td className="py-2 px-4 border-b">${item.costPerUnit.toFixed(2)}</td>
                    <td className="py-2 px-4 border-b">
                      <button
                        onClick={() => deleteItem(item.id)}
                        disabled={isDeleting}
                        className="bg-red-500 text-white py-1 px-3 rounded text-sm mr-2 hover:bg-red-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          setStockUpdateForm({
                            id: item.id,
                            updateData: {
                              quantity: 0,
                              type: 'restock',
                              note: ''
                            }
                          });
                          // Scroll to stock update form
                          document.getElementById('stock-update-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="bg-blue-500 text-white py-1 px-3 rounded text-sm hover:bg-blue-600"
                      >
                        Update Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No inventory items found.</p>
        )}
      </div>
      
      {/* Add New Item Form */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">Add New Item</h2>
        <form onSubmit={handleNewItemSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newItemForm.name}
              onChange={handleNewItemChange}
              className={`w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              id="category"
              name="category"
              value={newItemForm.category}
              onChange={handleNewItemChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="ingredient">Ingredient</option>
              <option value="beverage">Beverage</option>
              <option value="supplies">Supplies</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="currentStock" className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
            <input
              type="number"
              id="currentStock"
              name="currentStock"
              value={newItemForm.currentStock}
              onChange={handleNewItemChange}
              min="0"
              step="0.01"
              className={`w-full rounded-md border ${errors.currentStock ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
            />
            {errors.currentStock && <p className="text-red-500 text-xs mt-1">{errors.currentStock}</p>}
          </div>
          
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input
              type="text"
              id="unit"
              name="unit"
              value={newItemForm.unit}
              onChange={handleNewItemChange}
              placeholder="kg, litres, pieces"
              className={`w-full rounded-md border ${errors.unit ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
            />
            {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
          </div>
          
          <div>
            <label htmlFor="minStockLevel" className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
            <input
              type="number"
              id="minStockLevel"
              name="minStockLevel"
              value={newItemForm.minStockLevel}
              onChange={handleNewItemChange}
              min="0"
              step="0.01"
              className={`w-full rounded-md border ${errors.minStockLevel ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
            />
            {errors.minStockLevel && <p className="text-red-500 text-xs mt-1">{errors.minStockLevel}</p>}
          </div>
          
          <div>
            <label htmlFor="reorderPoint" className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
            <input
              type="number"
              id="reorderPoint"
              name="reorderPoint"
              value={newItemForm.reorderPoint}
              onChange={handleNewItemChange}
              min="0"
              step="0.01"
              className={`w-full rounded-md border ${errors.reorderPoint ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
            />
            {errors.reorderPoint && <p className="text-red-500 text-xs mt-1">{errors.reorderPoint}</p>}
          </div>
          
          <div>
            <label htmlFor="costPerUnit" className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit</label>
            <input
              type="number"
              id="costPerUnit"
              name="costPerUnit"
              value={newItemForm.costPerUnit}
              onChange={handleNewItemChange}
              min="0"
              step="0.01"
              className={`w-full rounded-md border ${errors.costPerUnit ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
            />
            {errors.costPerUnit && <p className="text-red-500 text-xs mt-1">{errors.costPerUnit}</p>}
          </div>
          
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">Supplier (Optional)</label>
            <input
              type="text"
              id="supplier"
              name="supplier"
              value={newItemForm.supplier}
              onChange={handleNewItemChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Storage Location (Optional)</label>
            <input
              type="text"
              id="location"
              name="location"
              value={newItemForm.location}
              onChange={handleNewItemChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isCreating}
              className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50 mt-2"
            >
              {isCreating ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Stock Update Form */}
      <div id="stock-update-form" className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Update Stock</h2>
        <form onSubmit={handleStockUpdateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="stock-item-id" className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
            <select
              id="stock-item-id"
              name="id"
              value={stockUpdateForm.id}
              onChange={handleStockUpdateChange}
              className={`w-full rounded-md border ${errors.id ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
            >
              <option value="">Select an item</option>
              {inventoryItems?.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} - Current: {item.currentStock} {item.unit}
                </option>
              ))}
            </select>
            {errors.id && <p className="text-red-500 text-xs mt-1">{errors.id}</p>}
          </div>
          
          <div>
            <label htmlFor="stock-type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              id="stock-type"
              name="type"
              value={stockUpdateForm.updateData.type}
              onChange={handleStockUpdateChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="restock">Restock</option>
              <option value="usage">Usage</option>
              <option value="adjustment">Adjustment</option>
              <option value="waste">Waste</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="stock-quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              id="stock-quantity"
              name="quantity"
              value={stockUpdateForm.updateData.quantity}
              onChange={handleStockUpdateChange}
              min="0.01"
              step="0.01"
              className={`w-full rounded-md border ${errors.quantity ? 'border-red-500' : 'border-gray-300'} px-3 py-2`}
            />
            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
          </div>
          
          <div>
            <label htmlFor="stock-note" className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
            <textarea
              id="stock-note"
              name="note"
              value={stockUpdateForm.updateData.note}
              onChange={handleStockUpdateChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
            />
          </div>
          
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isUpdatingStock}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 mt-2"
            >
              {isUpdatingStock ? 'Updating...' : 'Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Wrapped component with error boundary and suspense
const InventoryManagement: React.FC = () => {
  return (
    <QuerySuspenseBoundary loadingMessage="Loading inventory data...">
      <InventoryManagementInner />
    </QuerySuspenseBoundary>
  );
};

export default InventoryManagement; 