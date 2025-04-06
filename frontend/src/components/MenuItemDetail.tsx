import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens: string[];
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: {
    _id: string;
    name: string;
  } | string;
  imageUrl: string;
  ingredients: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  preparationTime: number;
  discountPercentage: number;
  nutrition: NutritionInfo;
}

const MenuItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => {
    const fetchMenuItem = async () => {
      if (!id) {
        setError('Menu item ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/menu-items/${id}`);
        
        if (response.data.status === 'success') {
          setMenuItem(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to load menu item');
        }
      } catch (err: any) {
        console.error('Error loading menu item:', err);
        setError(`Could not load menu item: ${err.response?.data?.message || err.message}`);
        toast.error(`Error: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItem();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      // Get CSRF token
      const csrfResponse = await axios.get('/api/csrf-token');
      const csrfToken = csrfResponse.data.csrfToken;
      
      const response = await axios.delete(`/api/menu-items/${id}`, {
        headers: {
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });
      
      if (response.data.status === 'success') {
        toast.success('Menu item deleted successfully');
        navigate('/menu-items');
      } else {
        throw new Error(response.data.message || 'Failed to delete menu item');
      }
    } catch (err: any) {
      console.error('Error deleting menu item:', err);
      toast.error(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setConfirmDelete(false);
    }
  };

  // Calculate discounted price
  const getDiscountedPrice = (): number => {
    if (!menuItem) return 0;
    if (menuItem.discountPercentage <= 0) return menuItem.price;
    return menuItem.price * (1 - menuItem.discountPercentage / 100);
  };

  // Get category name
  const getCategoryName = (): string => {
    if (!menuItem) return '';
    
    if (typeof menuItem.category === 'string') {
      return 'Unknown Category'; // Ideally you would fetch the category name
    } else {
      return menuItem.category.name;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !menuItem) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 p-4 rounded-md text-red-700">
          {error || 'Menu item not found'}
        </div>
        <button 
          onClick={() => navigate('/menu-items')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2">
            {menuItem.imageUrl ? (
              <img 
                src={menuItem.imageUrl} 
                alt={menuItem.name} 
                className="w-full h-64 md:h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/600x400?text=No+Image';
                }}
              />
            ) : (
              <div className="w-full h-64 md:h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-lg">No Image Available</span>
              </div>
            )}
          </div>
          
          <div className="md:w-1/2 p-6">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold text-gray-900">{menuItem.name}</h1>
              
              {!menuItem.isAvailable && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Unavailable
                </span>
              )}
            </div>
            
            <p className="text-gray-600 mt-2">{getCategoryName()}</p>
            
            <div className="mt-4">
              {menuItem.discountPercentage > 0 ? (
                <div className="flex items-baseline">
                  <span className="text-gray-400 line-through mr-2">${menuItem.price.toFixed(2)}</span>
                  <span className="text-2xl font-bold text-red-600">${getDiscountedPrice().toFixed(2)}</span>
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    {menuItem.discountPercentage}% OFF
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-gray-900">${menuItem.price.toFixed(2)}</span>
              )}
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {menuItem.isFeatured && (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Featured
                </span>
              )}
              
              {menuItem.isVegetarian && (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Vegetarian
                </span>
              )}
              
              {menuItem.isVegan && (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Vegan
                </span>
              )}
              
              {menuItem.isGlutenFree && (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Gluten Free
                </span>
              )}
              
              {menuItem.isSpicy && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Spicy
                </span>
              )}
            </div>
            
            <p className="mt-4 text-gray-700">{menuItem.description}</p>
            
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900">Preparation Time</h2>
              <p className="text-gray-700">{menuItem.preparationTime} minutes</p>
            </div>
            
            {isAdmin && (
              <div className="mt-8 flex space-x-4">
                <button
                  onClick={() => navigate(`/menu-items/edit/${menuItem._id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingredients</h2>
              {menuItem.ingredients.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {menuItem.ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No ingredients listed</p>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Nutrition Information</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-500">Calories</p>
                    <p className="font-medium">{menuItem.nutrition.calories} kcal</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Protein</p>
                    <p className="font-medium">{menuItem.nutrition.protein}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Carbs</p>
                    <p className="font-medium">{menuItem.nutrition.carbs}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fat</p>
                    <p className="font-medium">{menuItem.nutrition.fat}g</p>
                  </div>
                </div>
                
                {menuItem.nutrition.allergens.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-1">Allergens</p>
                    <div className="flex flex-wrap gap-1">
                      {menuItem.nutrition.allergens.map((allergen, index) => (
                        <span 
                          key={index}
                          className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <button 
          onClick={() => navigate('/menu-items')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to Menu
        </button>
      </div>
      
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete "{menuItem.name}"? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuItemDetail; 