import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useMenuItems, useCategories } from '../hooks/useMenuItems';
import { MenuItem } from '../services/menuService';
import { toast } from 'react-hot-toast';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorBoundary from './ErrorBoundary';
import { refreshCsrfToken } from '../services/menuService';
import axios from 'axios';

interface MenuItemFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  ingredients: string;
  allergens: string;
  isAvailable: boolean;
  isSpecialOffer: boolean;
  isFeatured: boolean;
}

const MenuManagementInner: React.FC = () => {
  const { 
    menuItems, 
    isLoading, 
    error,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    isCreating,
    isUpdating,
    isDeleting
  } = useMenuItems();
  
  // Fetch categories
  const {
    categories,
    isLoading: categoriesLoading
  } = useCategories();
  
  // Form state for adding/editing items
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'main',
    image: '',
    ingredients: '',
    allergens: '',
    isAvailable: true,
    isSpecialOffer: false,
    isFeatured: false
  });
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh CSRF token when component mounts
  useEffect(() => {
    const refreshToken = async () => {
      try {
        const token = await refreshCsrfToken();
        console.log('CSRF token refreshed on component mount:', token ? 'Success' : 'Failed');
        
        if (!token) {
          // Try once more after a short delay
          setTimeout(async () => {
            const retryToken = await refreshCsrfToken();
            console.log('CSRF token retry result:', retryToken ? 'Success' : 'Failed');
            
            if (!retryToken) {
              toast.error('Unable to secure the form. Please reload the page.');
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error refreshing CSRF token:', error);
        toast.error('Authentication error. Please reload the page.');
      }
    };
    
    refreshToken();
    
    // Set up a periodic refresh every 10 minutes
    const intervalId = setInterval(refreshToken, 10 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // For debugging
  useEffect(() => {
    if (menuItems) {
      console.log('Menu items loaded:', menuItems);
    }
  }, [menuItems]);
  
  // Category loading
  useEffect(() => {
    // Set a default valid category when categories are loaded
    if (categories && categories.length > 0 && formMode === 'add') {
      // Set the first available category ID as default
      setFormData(prev => ({
        ...prev,
        category: categories[0].id
      }));
    }
  }, [categories, formMode]);
  
  // Reset form
  const resetForm = () => {
    const defaultCategory = categories && categories.length > 0 ? categories[0].id : '';
    
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: defaultCategory,
      image: '',
      ingredients: '',
      allergens: '',
      isAvailable: true,
      isSpecialOffer: false,
      isFeatured: false
    });
    setErrors({});
    setFormMode('add');
    setCurrentItemId(null);
  };
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : name === 'price' 
          ? parseFloat(value) || 0 
          : value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // In a real app, you'd upload the file to a server/cloud storage
      // For now, we'll just use a placeholder URL
      setFormData(prev => ({
        ...prev,
        image: URL.createObjectURL(file)
      }));
    }
  };
  
  // Load item data for editing
  const handleEditItem = (item: MenuItem) => {
    console.log('Editing item:', item);
    setFormMode('edit');
    setCurrentItemId(item.id);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: typeof item.category === 'string' ? item.category : item.category?.id || '',
      image: item.imageUrl || '',
      ingredients: item.ingredients?.join(', ') || '',
      allergens: item.nutrition?.allergens?.join(', ') || '',
      isAvailable: item.isAvailable,
      isSpecialOffer: item.discountPercentage ? item.discountPercentage > 0 : false,
      isFeatured: item.isFeatured || false
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors: Record<string, string> = {};
    
    if (!formData.name) {
      validationErrors.name = 'Name is required';
    }
    
    if (formData.price <= 0) {
      validationErrors.price = 'Price must be greater than zero';
    }
    
    if (!formData.category) {
      validationErrors.category = 'Category is required';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Process ingredients and allergens from comma-separated string to array
    const ingredientsArray = formData.ingredients ? formData.ingredients.split(',').map(i => i.trim()).filter(i => i) : [];
    const allergensArray = formData.allergens ? formData.allergens.split(',').map(a => a.trim()).filter(a => a) : [];
    
    try {
      console.log('Preparing to create/update menu item...');
      
      // Prepare data for API based on menuItemSchema.js requirements
      const menuItemData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        category: formData.category, // This should be a valid category ID
        imageUrl: formData.image,
        ingredients: ingredientsArray,
        isAvailable: formData.isAvailable,
        isFeatured: formData.isFeatured,
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isSpicy: false,
        preparationTime: 0,
        discountPercentage: formData.isSpecialOffer ? 10 : 0,
        nutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          allergens: allergensArray
        }
      };
      
      console.log('Submitting menu item data:', JSON.stringify(menuItemData, null, 2));
      
      // Get CSRF token using the enhanced refreshCsrfToken function
      try {
        console.log('Getting CSRF token from menuService...');
        const csrfToken = await refreshCsrfToken();
        console.log('CSRF token obtained:', csrfToken ? 'Valid token' : 'No token');
        
        if (!csrfToken) {
          throw new Error('Could not get CSRF token - please reload the page and try again');
        }
        
        // Set up headers with the token
        const headers = {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        };
        
        if (formMode === 'add') {
          console.log('Making API call to create menu item...');
          const response = await axios.post('/api/menu-items', menuItemData, {
            headers,
            withCredentials: true
          });
          
          console.log('Create menu item API response:', response.status, response.statusText);
          if (response.status === 201 || response.status === 200) {
            toast.success('Menu item created successfully');
            resetForm();
            // Refresh the menu items list
            handleRefresh();
          }
        } else if (formMode === 'edit' && currentItemId) {
          console.log('Making API call to update menu item:', currentItemId);
          const response = await axios.put(`/api/menu-items/${currentItemId}`, menuItemData, {
            headers,
            withCredentials: true
          });
          
          console.log('Update menu item API response:', response.status, response.statusText);
          if (response.status === 200) {
            toast.success('Menu item updated successfully');
            resetForm();
            // Refresh the menu items list
            handleRefresh();
          }
        }
      } catch (apiError: any) {
        console.error('API Error:', apiError);
        console.error('Response data:', apiError.response?.data);
        toast.error(`API Error: ${apiError.response?.data?.message || apiError.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('General Error:', error);
      toast.error(`Error: ${error.message || 'Unknown error occurred'}`);
    }
  };
  
  // Handle delete confirmation
  const handleDeleteItem = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };
  
  // Confirm delete action
  const confirmDeleteItem = async () => {
    if (!itemToDelete) {
      toast.error('No item selected for deletion');
      setShowDeleteModal(false);
      return;
    }
    
    try {
      // Additional validation to prevent sending undefined ID 
      if (itemToDelete === 'undefined' || itemToDelete === undefined) {
        throw new Error('Invalid menu item ID');
      }
      
      console.log(`Attempting to delete menu item with ID: ${itemToDelete}`);
      
      // Get fresh CSRF token
      const csrfToken = await refreshCsrfToken();
      if (!csrfToken) {
        throw new Error('Could not get security token. Please reload the page.');
      }
      
      // Make direct API call instead of using the mutation
      const response = await axios.delete(`/api/menu-items/${itemToDelete}`, {
        headers: {
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });
      
      if (response.status === 200) {
        toast.success('Menu item deleted successfully');
        // Refresh the menu items list
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error deleting menu item:', error);
      toast.error(`Failed to delete: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };
  
  // Cancel delete
  const cancelDeleteItem = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };
  
  // Function to refresh menu items
  const handleRefresh = () => {
    // Trigger a refetch of the menu items data
    window.location.reload();
  };
  
  // Handle availability toggle
  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      console.log(`Toggling availability for item ${id} from ${currentStatus ? 'available' : 'unavailable'} to ${!currentStatus ? 'available' : 'unavailable'}`);
      
      // Get fresh CSRF token
      const csrfToken = await refreshCsrfToken();
      if (!csrfToken) {
        throw new Error('Could not get security token. Please reload the page.');
      }
      
      // Make direct API call for better control
      const response = await axios.put(
        `/api/menu-items/${id}`, 
        { isAvailable: !currentStatus },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          withCredentials: true
        }
      );
      
      if (response.status === 200) {
        toast.success(`Item ${currentStatus ? 'disabled' : 'enabled'} successfully`);
        // Refresh the menu items list
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error toggling availability:', error);
      toast.error(`Failed to update: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Menu Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Menu Item Form */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">
            {formMode === 'add' ? 'Add New Menu Item' : 'Edit Menu Item'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            
            {/* Price */}
            <div className="mb-4">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price ($) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`mt-1 block w-full rounded-md ${
                  errors.price ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
            </div>
            
            {/* Category */}
            <div className="mb-4">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md ${
                  errors.category ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
              >
                <option value="">Select a category</option>
                {categoriesLoading ? (
                  <option value="" disabled>Loading categories...</option>
                ) : categories && categories.length > 0 ? (
                  categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No categories available</option>
                )}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
              {!categoriesLoading && (!categories || categories.length === 0) && (
                <p className="mt-1 text-xs text-yellow-600">
                  No categories available. Please create a category first.
                </p>
              )}
            </div>
            
            {/* Description */}
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            {/* Ingredients */}
            <div className="mb-4">
              <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700 mb-1">
                Ingredients (comma-separated)
              </label>
              <textarea
                id="ingredients"
                name="ingredients"
                value={formData.ingredients}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g. Tomato, Cheese, Basil"
              />
            </div>
            
            {/* Allergens */}
            <div className="mb-4">
              <label htmlFor="allergens" className="block text-sm font-medium text-gray-700 mb-1">
                Allergens (comma-separated)
              </label>
              <textarea
                id="allergens"
                name="allergens"
                value={formData.allergens}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g. Gluten, Dairy, Nuts"
              />
            </div>
            
            {/* Image Upload */}
            <div className="mb-4">
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                Item Image
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Choose File
                </button>
                <span className="ml-3 text-sm text-gray-500">
                  {formData.image ? 'Image selected' : 'No file chosen'}
                </span>
                <input
                  type="file"
                  id="image"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
              {formData.image && (
                <div className="mt-2">
                  <img 
                    src={formData.image} 
                    alt="Menu item preview" 
                    className="h-24 w-24 object-cover rounded"
                  />
                </div>
              )}
            </div>
            
            {/* Checkboxes */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAvailable"
                  name="isAvailable"
                  checked={formData.isAvailable}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-900">
                  Item is available
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isSpecialOffer"
                  name="isSpecialOffer"
                  checked={formData.isSpecialOffer}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isSpecialOffer" className="ml-2 block text-sm text-gray-900">
                  Special offer
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isFeatured"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">
                  Featured item
                </label>
              </div>
            </div>
            
            {/* Form Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium disabled:opacity-50"
              >
                {isCreating || isUpdating ? 'Saving...' : formMode === 'add' ? 'Add Item' : 'Update Item'}
              </button>
              
              {formMode === 'edit' && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        
        {/* Menu Items List */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Menu Items</h2>
            <button 
              onClick={handleRefresh} 
              className="text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
          
          {isLoading ? (
            <p className="text-center py-8">Loading menu items...</p>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>Error loading menu items</p>
              <button 
                onClick={handleRefresh} 
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Try Again
              </button>
            </div>
          ) : menuItems && menuItems.length > 0 ? (
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Item
                    </th>
                    <th 
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Price
                    </th>
                    <th 
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Category
                    </th>
                    <th 
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th 
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {menuItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.imageUrl && (
                            <div className="flex-shrink-0 h-10 w-10 mr-3">
                              <img 
                                className="h-10 w-10 rounded-full object-cover" 
                                src={item.imageUrl} 
                                alt={item.name} 
                              />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${item.price.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {typeof item.category === 'string'
                            ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
                            : item.category?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                        {item.isFeatured && (
                          <span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            Featured
                          </span>
                        )}
                        {item.discountPercentage && item.discountPercentage > 0 && (
                          <span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Special
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                            title="Edit item"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                            disabled={isUpdating}
                            className="text-yellow-600 hover:text-yellow-900 px-2 py-1 rounded hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={item.isAvailable ? "Disable item" : "Enable item"}
                          >
                            {item.isAvailable ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete item permanently"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500 italic">No menu items found</p>
          )}
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p className="font-semibold">Error loading menu items:</p>
          <p>{error.toString()}</p>
          <button 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700"
            onClick={handleRefresh}
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-md">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
            </div>
            
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this menu item? This action cannot be undone.
              </p>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none"
                onClick={cancelDeleteItem}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none disabled:opacity-50"
                onClick={confirmDeleteItem}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapped component with suspense and error boundary
const MenuManagement: React.FC = () => {
  return (
    <ErrorBoundary fallback={<div className="text-center py-8 text-red-600">Something went wrong loading the menu management page</div>}>
      <Suspense fallback={<LoadingSpinner message="Loading menu data..." />}>
        <MenuManagementInner />
      </Suspense>
    </ErrorBoundary>
  );
};

export default MenuManagement; 