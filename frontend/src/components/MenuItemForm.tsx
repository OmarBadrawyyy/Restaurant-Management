import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

// Types for our component
interface Category {
  _id: string;
  name: string;
}

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens: string[];
}

interface MenuItem {
  _id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
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

interface MenuItemFormProps {
  mode: 'create' | 'edit';
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingredientInput, setIngredientInput] = useState('');
  const [allergenInput, setAllergenInput] = useState('');
  
  // Initial form state
  const initialFormState: MenuItem = {
    name: '',
    description: '',
    price: 0,
    category: '',
    imageUrl: '',
    ingredients: [],
    isAvailable: true,
    isFeatured: false,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    preparationTime: 0,
    discountPercentage: 0,
    nutrition: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      allergens: []
    }
  };
  
  const [formData, setFormData] = useState<MenuItem>(initialFormState);

  const isAdminOrManager = 
    currentUser?.role === 'admin' || 
    currentUser?.role === 'manager';

  // Check if user is authorized to access this page
  useEffect(() => {
    if (!currentUser || !isAdminOrManager) {
      toast.error('You do not have permission to access this page');
      navigate('/menu-items');
    }
  }, [currentUser, navigate, isAdminOrManager]);

  // Load categories and menu item data if in edit mode
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch categories
        const categoriesResponse = await axios.get('/api/menu/');
        setCategories(categoriesResponse.data.data || []);
        
        // If in edit mode, fetch the menu item
        if (mode === 'edit' && id) {
          try {
            console.log(`Loading menu item with ID: ${id}`);
            const itemResponse = await axios.get(`/api/menu-items/${id}`);
            
            if (itemResponse.data.status === 'success') {
              const menuItem = itemResponse.data.data;
              
              // Format the data to match our form structure
              setFormData({
                ...menuItem,
                // If category is an object, extract the ID
                category: typeof menuItem.category === 'object' ? 
                  menuItem.category._id : menuItem.category,
                // Ensure all required properties exist
                nutrition: menuItem.nutrition || initialFormState.nutrition
              });
              
              console.log('Menu item loaded successfully:', menuItem);
            } else {
              throw new Error('Failed to load menu item');
            }
          } catch (err: any) {
            console.error('Error loading menu item:', err);
            setError(`Could not load menu item: ${err.response?.data?.message || err.message}`);
            toast.error(`Failed to load menu item: ${err.response?.data?.message || err.message}`);
          }
        }
      } catch (err: any) {
        console.error('Error loading form data:', err);
        setError(`Failed to load data: ${err.response?.data?.message || err.message}`);
        toast.error(`Error: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, id]);

  // Create a CSRF-protected axios instance
  const createAxiosWithCsrf = async () => {
    try {
      // Get CSRF token
      const csrfResponse = await axios.get('/api/csrf-token');
      const csrfToken = csrfResponse.data.csrfToken;
      
      return axios.create({
        headers: {
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        withCredentials: true
      });
    } catch (err) {
      console.error('Failed to get CSRF token:', err);
      return axios.create({
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        withCredentials: true
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Get CSRF token
      const csrfResponse = await axios.get('/api/csrf-token');
      const csrfToken = csrfResponse.data.csrfToken;
      
      const headers = {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      };

      let response;
      
      // Create or update the menu item
      if (mode === 'create') {
        response = await axios.post('/api/menu-items', formData, { 
          headers, 
          withCredentials: true 
        });
        
        if (response.data.status === 'success') {
          toast.success('Menu item created successfully!');
          navigate('/manager/dashboard?tab=menu');
        }
      } else if (id) {
        response = await axios.put(`/api/menu-items/${id}`, formData, { 
          headers, 
          withCredentials: true 
        });
        
        if (response.data.status === 'success') {
          toast.success('Menu item updated successfully!');
          navigate('/manager/dashboard?tab=menu');
        }
      }
    } catch (err: any) {
      console.error('Error saving menu item:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save menu item';
      setError(`Failed to save: ${errorMessage}`);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: Number(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle nutrition field changes
  const handleNutritionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      nutrition: {
        ...prev.nutrition,
        [name]: Number(value)
      }
    }));
  };
  
  // Add an ingredient to the list
  const handleAddIngredient = () => {
    if (ingredientInput.trim()) {
      setFormData(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, ingredientInput.trim()]
      }));
      setIngredientInput('');
    }
  };
  
  // Remove an ingredient from the list
  const handleRemoveIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };
  
  // Add an allergen to the list
  const handleAddAllergen = () => {
    if (allergenInput.trim()) {
      setFormData(prev => ({
        ...prev,
        nutrition: {
          ...prev.nutrition,
          allergens: [...prev.nutrition.allergens, allergenInput.trim()]
        }
      }));
      setAllergenInput('');
    }
  };
  
  // Remove an allergen from the list
  const handleRemoveAllergen = (index: number) => {
    setFormData(prev => ({
      ...prev,
      nutrition: {
        ...prev.nutrition,
        allergens: prev.nutrition.allergens.filter((_, i) => i !== index)
      }
    }));
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
        <h1 className="text-2xl font-bold mb-6">
          {mode === 'create' ? 'Add New Menu Item' : 'Edit Menu Item'}
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name *
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
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price *
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    name="price"
                    id="price"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <select
                  name="category"
                  id="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-700">
                  Discount (%)
                </label>
                <input
                  type="number"
                  name="discountPercentage"
                  id="discountPercentage"
                  min="0"
                  max="100"
                  value={formData.discountPercentage}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="sm:col-span-2">
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
                {formData.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={formData.imageUrl} 
                      alt="Menu item preview" 
                      className="h-24 w-24 object-cover rounded-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/150?text=Image+Error';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Ingredients</h2>
            
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                placeholder="Add an ingredient"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddIngredient}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="bg-gray-100 rounded-full px-3 py-1 flex items-center">
                  <span>{ingredient}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(index)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Nutrition</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="calories" className="block text-sm font-medium text-gray-700">
                  Calories
                </label>
                <input
                  type="number"
                  name="calories"
                  id="calories"
                  min="0"
                  value={formData.nutrition.calories}
                  onChange={handleNutritionChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="protein" className="block text-sm font-medium text-gray-700">
                  Protein (g)
                </label>
                <input
                  type="number"
                  name="protein"
                  id="protein"
                  min="0"
                  step="0.1"
                  value={formData.nutrition.protein}
                  onChange={handleNutritionChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="carbs" className="block text-sm font-medium text-gray-700">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  name="carbs"
                  id="carbs"
                  min="0"
                  step="0.1"
                  value={formData.nutrition.carbs}
                  onChange={handleNutritionChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="fat" className="block text-sm font-medium text-gray-700">
                  Fat (g)
                </label>
                <input
                  type="number"
                  name="fat"
                  id="fat"
                  min="0"
                  step="0.1"
                  value={formData.nutrition.fat}
                  onChange={handleNutritionChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="sm:col-span-2">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Allergens</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="text"
                    value={allergenInput}
                    onChange={(e) => setAllergenInput(e.target.value)}
                    placeholder="Add an allergen"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAllergen}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.nutrition.allergens.map((allergen, index) => (
                    <div key={index} className="bg-red-100 rounded-full px-3 py-1 flex items-center">
                      <span>{allergen}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergen(index)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Additional Information</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="preparationTime" className="block text-sm font-medium text-gray-700">
                  Preparation Time (minutes)
                </label>
                <input
                  type="number"
                  name="preparationTime"
                  id="preparationTime"
                  min="0"
                  value={formData.preparationTime}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="isAvailable"
                    name="isAvailable"
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isAvailable" className="font-medium text-gray-700">Available</label>
                  <p className="text-gray-500">Item is available for ordering</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="isFeatured"
                    name="isFeatured"
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isFeatured" className="font-medium text-gray-700">Featured</label>
                  <p className="text-gray-500">Highlight this item on the menu</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="isVegetarian"
                    name="isVegetarian"
                    type="checkbox"
                    checked={formData.isVegetarian}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isVegetarian" className="font-medium text-gray-700">Vegetarian</label>
                  <p className="text-gray-500">Does not contain meat</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="isVegan"
                    name="isVegan"
                    type="checkbox"
                    checked={formData.isVegan}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isVegan" className="font-medium text-gray-700">Vegan</label>
                  <p className="text-gray-500">Contains no animal products</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="isGlutenFree"
                    name="isGlutenFree"
                    type="checkbox"
                    checked={formData.isGlutenFree}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isGlutenFree" className="font-medium text-gray-700">Gluten Free</label>
                  <p className="text-gray-500">Does not contain gluten</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="isSpicy"
                    name="isSpicy"
                    type="checkbox"
                    checked={formData.isSpicy}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isSpicy" className="font-medium text-gray-700">Spicy</label>
                  <p className="text-gray-500">Contains hot or spicy ingredients</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/manager/dashboard?tab=menu')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`
                px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
              `}
            >
              {submitting ? 'Saving...' : mode === 'create' ? 'Create Item' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemForm; 