import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import menuService from '../services/menuService';
import { Category, MenuItem } from '../services/menuService';
import Button from './ui/Button';

interface CategoryFormProps {
  mode: 'create' | 'edit';
}

// Interface for our edit form data, with string versions of arrays
interface MenuItemFormData {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  ingredients?: string; // comma-separated string version
  isAvailable?: boolean;
  isFeatured?: boolean;
  discountPercentage?: number;
  allergens?: string; // comma-separated string version
}

const CategoryForm: React.FC<CategoryFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  
  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<MenuItem | null>(null);
  const [editFormData, setEditFormData] = useState<MenuItemFormData>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    description: '',
    imageUrl: '',
    displayOrder: 0,
    isActive: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (mode === 'edit' && id) {
          console.log(`Fetching category data for ID: ${id}`);
          const category = await menuService.getCategoryById(id);
          if (category) {
            console.log('Category data fetched successfully:', category);
            setFormData(category);
            
            // Fetch menu items for this category
            setItemsLoading(true);
            try {
              const items = await menuService.getMenuItemsByCategory(id);
              console.log(`Fetched ${items.length} menu items for category:`, items);
              setMenuItems(items);
            } catch (itemError) {
              console.error('Error fetching menu items for category:', itemError);
              toast.error('Could not load menu items for this category');
            } finally {
              setItemsLoading(false);
            }
          } else {
            console.error('No category data returned for ID:', id);
            setError('Could not find category data');
          }
        }
      } catch (error) {
        console.error('Error fetching category data:', error);
        setError('Error loading category data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    console.log(`Starting ${mode} submission for category:`, formData);
    
    try {
      // Make sure name is present
      if (!formData.name?.trim()) {
        setError('Category name is required');
        setSubmitting(false);
        return;
      }
      
      // Validate displayOrder is a number
      if (formData.displayOrder === undefined || isNaN(Number(formData.displayOrder))) {
        setFormData(prev => ({
          ...prev,
          displayOrder: 0
        }));
      }
      
      // Show network status
      console.log('Checking network status...');
      try {
        const networkStatus = navigator.onLine ? 'online' : 'offline';
        console.log(`Network status: ${networkStatus}`);
      } catch (e) {
        console.log('Could not determine network status');
      }
      
      // Log CSRF token retrieval
      console.log('Getting CSRF token...');
      await menuService.refreshCsrfToken();
      console.log('CSRF token refreshed');
      
      if (mode === 'create') {
        console.log('Creating new category with data:', formData);
        await menuService.createCategory(formData);
        console.log('Category creation API call completed');
        toast.success('Category created successfully');
      } else {
        console.log(`Updating category with ID: ${id}...`);
        console.log('Form data being sent:', formData);
        
        const result = await menuService.updateCategory(id!, formData);
        console.log('Update result:', result);
        toast.success('Category updated successfully');
      }
      
      // Wait a moment before redirecting
      setTimeout(() => {
        navigate('/manager/dashboard?tab=categories');
      }, 500);
    } catch (error: any) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} category:`, error);
      
      // Improved error message handling
      let errorMessage = 'An unexpected error occurred';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      // Add more detailed debugging for network or CORS issues
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
        console.error('This appears to be a network connectivity issue');
      }
      
      setError(`Failed to ${mode === 'create' ? 'create' : 'update'} category. ${errorMessage}`);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  // Function to handle cancel button
  const handleCancel = () => {
    navigate('/manager/dashboard?tab=categories');
  };

  // Function to open edit modal for a menu item
  const handleEditMenuItem = (item: MenuItem) => {
    setCurrentEditItem(item);
    setEditFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      ingredients: item.ingredients ? item.ingredients.join(', ') : '',
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      discountPercentage: item.discountPercentage || 0,
      allergens: item.nutrition?.allergens ? item.nutrition.allergens.join(', ') : ''
    });
    setIsEditModalOpen(true);
  };

  // Function to handle edit form changes
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
          ? parseFloat(value) 
          : value
    }));
  };

  // Function to handle menu item update
  const handleUpdateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditItem) return;
    
    setEditSubmitting(true);
    try {
      console.log('Updating menu item:', editFormData);
      
      // Process ingredients and allergens
      const ingredients = editFormData.ingredients 
        ? editFormData.ingredients.split(',').map(i => i.trim()) 
        : [];
      
      const allergensList = editFormData.allergens 
        ? editFormData.allergens.split(',').map(a => a.trim()) 
        : [];
      
      // Prepare the update data
      const updateData: Partial<MenuItem> = {
        name: editFormData.name,
        description: editFormData.description,
        price: editFormData.price,
        imageUrl: editFormData.imageUrl,
        ingredients,
        isAvailable: editFormData.isAvailable,
        isFeatured: editFormData.isFeatured,
        discountPercentage: editFormData.discountPercentage,
        nutrition: {
          ...currentEditItem.nutrition,
          allergens: allergensList
        }
      };
      
      // Send the update
      await menuService.updateMenuItem({
        id: currentEditItem.id,
        data: updateData
      });
      
      // Refresh the menu items
      const updatedItems = await menuService.getMenuItemsByCategory(id!);
      setMenuItems(updatedItems);
      
      toast.success('Menu item updated successfully');
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Error updating menu item:', error);
      toast.error(`Failed to update menu item: ${error.message || 'Unknown error'}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h2 className="text-2xl font-bold mb-6">
          {mode === 'create' ? 'Add New Category' : 'Edit Category'}
        </h2>
        
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
              Image URL
            </label>
            <input
              type="url"
              name="imageUrl"
              id="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="displayOrder" className="block text-sm font-medium text-gray-700">
              Display Order
            </label>
            <input
              type="number"
              name="displayOrder"
              id="displayOrder"
              value={formData.displayOrder}
              onChange={handleChange}
              required
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                submitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center`}
            >
              {submitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {submitting ? 'Processing...' : mode === 'create' ? 'Create Category' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Menu Items Section - Only display in edit mode */}
        {mode === 'edit' && (
          <div className="mt-10">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Menu Items in this Category</h3>
            
            {itemsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : menuItems.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {menuItems.map((item) => (
                    <li key={item.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {item.imageUrl && (
                            <div className="flex-shrink-0 h-12 w-12 mr-4">
                              <img 
                                className="h-12 w-12 rounded-md object-cover" 
                                src={item.imageUrl} 
                                alt={item.name} 
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://via.placeholder.com/150?text=No+Image';
                                }}
                              />
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-500 truncate">{item.description || 'No description'}</p>
                            <p className="text-sm font-medium text-gray-900">${item.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <div>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleEditMenuItem(item)}
                          >
                            Edit Item
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-md p-6 text-center">
                <p className="text-gray-500">No menu items in this category yet</p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => navigate('/manager/menu-items/new')}
                >
                  Add Menu Item
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Edit Menu Item Modal */}
        {isEditModalOpen && currentEditItem && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsEditModalOpen(false)}></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Edit Menu Item
                      </h3>
                      
                      <form onSubmit={handleUpdateMenuItem} className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                            Item Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="edit-name"
                            value={editFormData.name || ''}
                            onChange={handleEditFormChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700">
                            Price ($) *
                          </label>
                          <input
                            type="number"
                            name="price"
                            id="edit-price"
                            value={editFormData.price || ''}
                            onChange={handleEditFormChange}
                            required
                            step="0.01"
                            min="0"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <textarea
                            name="description"
                            id="edit-description"
                            value={editFormData.description || ''}
                            onChange={handleEditFormChange}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-ingredients" className="block text-sm font-medium text-gray-700">
                            Ingredients (comma-separated)
                          </label>
                          <textarea
                            name="ingredients"
                            id="edit-ingredients"
                            value={editFormData.ingredients || ''}
                            onChange={handleEditFormChange}
                            rows={2}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-allergens" className="block text-sm font-medium text-gray-700">
                            Allergens (comma-separated)
                          </label>
                          <textarea
                            name="allergens"
                            id="edit-allergens"
                            value={editFormData.allergens || ''}
                            onChange={handleEditFormChange}
                            rows={2}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-imageUrl" className="block text-sm font-medium text-gray-700">
                            Item Image URL
                          </label>
                          <input
                            type="url"
                            name="imageUrl"
                            id="edit-imageUrl"
                            value={editFormData.imageUrl || ''}
                            onChange={handleEditFormChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="isAvailable"
                              id="edit-isAvailable"
                              checked={editFormData.isAvailable}
                              onChange={handleEditFormChange}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="edit-isAvailable" className="ml-2 block text-sm text-gray-900">
                              Item is available
                            </label>
                          </div>
                          
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="isFeatured"
                              id="edit-isFeatured"
                              checked={editFormData.isFeatured}
                              onChange={handleEditFormChange}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="edit-isFeatured" className="ml-2 block text-sm text-gray-900">
                              Featured item
                            </label>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleUpdateMenuItem}
                    disabled={editSubmitting}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                      editSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {editSubmitting ? 'Updating...' : 'Update Item'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={editSubmitting}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryForm; 