import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';

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

interface Category {
  _id: string;
  name: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const MenuItemList: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availableFilter, setAvailableFilter] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(9);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build the query parameters
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      if (availableFilter !== null) {
        params.append('isAvailable', String(availableFilter));
      }
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }
      
      // Add pagination params
      params.append('page', String(currentPage));
      params.append('limit', String(itemsPerPage));
      
      const url = `/api/menu-items?${params.toString()}`;
      console.log('Fetching menu items from:', url);
      
      const response = await axios.get(url);
      
      if (response.data.status === 'success') {
        console.log('Menu items loaded:', response.data);
        setMenuItems(response.data.data);
        
        // Set pagination data if available
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
        }
      } else {
        throw new Error(response.data.message || 'Failed to load menu items');
      }
    } catch (err: any) {
      console.error('Error loading menu items:', err);
      setError(`Could not load menu items: ${err.response?.data?.message || err.message}`);
      toast.error(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      if (response.data.status === 'success') {
        setCategories(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to load categories');
      }
    } catch (err: any) {
      console.error('Error loading categories:', err);
      toast.error(`Error loading categories: ${err.response?.data?.message || err.message}`);
    }
  };
  
  // Initial data load
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchCategories()]);
    };
    
    fetchData();
  }, []);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, availableFilter, debouncedSearchTerm]);
  
  // Fetch menu items when page changes or filters change
  useEffect(() => {
    fetchMenuItems();
  }, [currentPage, categoryFilter, availableFilter, debouncedSearchTerm]);
  
  const handleDeleteConfirm = async (itemId: string) => {
    try {
      // Get CSRF token
      const csrfResponse = await axios.get('/api/csrf-token');
      const csrfToken = csrfResponse.data.csrfToken;
      
      const response = await axios.delete(`/api/menu-items/${itemId}`, {
        headers: {
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });
      
      if (response.data.status === 'success') {
        toast.success('Menu item deleted successfully');
        // Remove the item from the local state
        setMenuItems(prev => prev.filter(item => item._id !== itemId));
      } else {
        throw new Error(response.data.message || 'Failed to delete menu item');
      }
    } catch (err: any) {
      console.error('Error deleting menu item:', err);
      toast.error(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setConfirmDelete(null); // Close the confirmation dialog
    }
  };
  
  // Get category name from either string or object
  const getCategoryName = (category: string | { _id: string; name: string } | null | undefined): string => {
    if (!category) return 'Unknown Category';
    
    if (typeof category === 'string') {
      const foundCategory = categories.find(cat => cat._id === category);
      return foundCategory ? foundCategory.name : 'Unknown Category';
    } else if (typeof category === 'object' && category !== null && 'name' in category) {
      return category.name;
    }
    
    return 'Unknown Category';
  };
  
  // Format price with discount
  const formatPrice = (price: number, discountPercentage: number): JSX.Element => {
    if (discountPercentage <= 0) {
      return <span>${price.toFixed(2)}</span>;
    }
    
    const discountedPrice = price * (1 - discountPercentage / 100);
    
    return (
      <div className="flex flex-col">
        <span className="line-through text-gray-500">${price.toFixed(2)}</span>
        <span className="text-red-600 font-medium">${discountedPrice.toFixed(2)}</span>
      </div>
    );
  };
  
  // Render dietary tags
  const renderDietaryTags = (item: MenuItem): JSX.Element => {
    const tags = [];
    
    if (item.isVegetarian) tags.push(
      <span key="veg" className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Vegetarian</span>
    );
    
    if (item.isVegan) tags.push(
      <span key="vegan" className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Vegan</span>
    );
    
    if (item.isGlutenFree) tags.push(
      <span key="gf" className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Gluten Free</span>
    );
    
    if (item.isSpicy) tags.push(
      <span key="spicy" className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Spicy</span>
    );
    
    return <div className="flex flex-wrap gap-1 mt-1">{tags}</div>;
  };
  
  // Pagination controls component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center mt-6">
        <nav className="flex items-center">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-l-md border ${
              currentPage === 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-blue-600 hover:bg-blue-50'
            }`}
          >
            Previous
          </button>
          
          <div className="px-4 py-1 border-t border-b bg-white">
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-r-md border ${
              currentPage === totalPages 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-blue-600 hover:bg-blue-50'
            }`}
          >
            Next
          </button>
        </nav>
      </div>
    );
  };

  if (loading && menuItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Array.isArray(categories) && categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="available-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Availability
            </label>
            <select
              id="available-filter"
              value={availableFilter === null ? 'all' : String(availableFilter)}
              onChange={(e) => {
                const value = e.target.value;
                setAvailableFilter(value === 'all' ? null : value === 'true');
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Items</option>
              <option value="true">Available Only</option>
              <option value="false">Unavailable Only</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="search-term" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              id="search-term"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search menu items..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {menuItems.length === 0 && !loading ? (
        <div className="bg-yellow-100 p-4 rounded-md text-yellow-800">
          No menu items found. Try changing your filters or add a new menu item.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map(item => (
              <div 
                key={item._id}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${!item.isAvailable ? 'opacity-60' : ''}`}
              >
                <Link to={`/menu-items/${item._id}`} className="block">
                  <div className="relative h-48 bg-gray-200">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-200 text-gray-400">
                        No Image
                      </div>
                    )}
                    
                    {item.isFeatured && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded-md">
                        Featured
                      </div>
                    )}
                    
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">Unavailable</span>
                      </div>
                    )}
                  </div>
                </Link>
                
                <div className="p-4">
                  <Link to={`/menu-items/${item._id}`} className="block">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <div className="text-right">
                        {formatPrice(item.price, item.discountPercentage)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">{item.category ? getCategoryName(item.category) : 'Unknown Category'}</p>
                    
                    {renderDietaryTags(item)}
                    
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{item.description}</p>
                  </Link>
                  
                  {isAdmin && (
                    <div className="mt-4 flex justify-between items-center">
                      <Link 
                        to={`/menu-items/edit/${item._id}`}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Edit
                      </Link>
                      
                      <button
                        onClick={() => setConfirmDelete(item._id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <PaginationControls />
        </>
      )}
      
      {isAdmin && (
        <div className="mt-6 flex justify-end">
          <Link 
            to="/menu-items/create"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add New Item
          </Link>
        </div>
      )}
      
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete this menu item? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(confirmDelete)}
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

export default MenuItemList; 