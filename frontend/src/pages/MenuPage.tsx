import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import menuService, { MenuItem, Category } from '../services/menuService';
import { useCart } from '../context/CartContext';

const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, addToCart: addItemToCart, getItemCount, getSubtotal } = useCart();
  
  // State for menu items and categories
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Load menu items and categories
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const items = await menuService.getAllMenuItems();
        // Filter only available menu items
        const availableItems = items.filter((item: MenuItem) => item.isAvailable);
        setMenuItems(availableItems);
      } catch (err) {
        console.error('Failed to fetch menu items', err);
        setError('Failed to load menu items from database. Please try again later.');
      }
    };
    
    const fetchCategories = async () => {
      try {
        const cats = await menuService.getAllCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to fetch categories', err);
        setError('Failed to load categories from database. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMenuItems();
    fetchCategories();
  }, []);
  
  // Filter menu items based on selected category and search term
  const filteredMenuItems = menuItems.filter(item => {
    const categoryId = typeof item.category === 'string' ? item.category : item.category.id;
    const matchesCategory = selectedCategory === 'all' || categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    return matchesCategory && matchesSearch;
  });
  
  // Group menu items by category
  const groupedMenuItems = filteredMenuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const category = categories.find(cat => {
      const itemCategoryId = typeof item.category === 'string' ? item.category : item.category.id;
      return cat.id === itemCategoryId;
    });
    const categoryName = category ? category.name : 'Uncategorized';
    
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    
    acc[categoryName].push(item);
    return acc;
  }, {});
  
  // Add to cart function
  const handleAddToCart = (menuItem: MenuItem) => {
    console.log('Adding to cart:', menuItem);
    
    // Ensure price is a number
    const itemPrice = typeof menuItem.price === 'string' 
      ? parseFloat(menuItem.price) 
      : menuItem.price;
    
    if (isNaN(itemPrice)) {
      console.error('Invalid price for menu item:', menuItem);
      toast.error('Could not add item to cart: invalid price');
      return;
    }
    
    // Add to cart using the context
    addItemToCart({
      itemId: menuItem.id,
      name: menuItem.name,
      price: itemPrice,
      quantity: 1
    });
  };
  
  // Calculate cart values from context
  const cartItemsCount = getItemCount();
  const cartTotal = getSubtotal();
  
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }
  
  if (error || menuItems.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-xl shadow-sm p-8 max-w-lg mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Menu Unavailable</h1>
            <p className="text-gray-600 mb-6">{error || 'No menu items available'}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Our Menu</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
        
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Menu
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for dishes..."
                className="w-full p-3 border rounded-lg focus:ring-black focus:border-black"
              />
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-black focus:border-black"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Menu Items */}
        {Object.keys(groupedMenuItems).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-medium text-gray-900 mb-2">No items found</h2>
            <p className="text-gray-500 mb-6">Try changing your search or filter criteria.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchTerm('');
              }}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedMenuItems).map(([categoryName, items]) => (
              <div key={categoryName}>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{categoryName}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map(item => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      {item.imageUrl && (
                        <div className="h-48 bg-gray-200">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                          <span className="font-bold text-gray-900">${item.price.toFixed(2)}</span>
                        </div>
                        <p className="text-gray-600 mt-2 mb-4">{item.description}</p>
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="w-full py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Floating Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white shadow-lg border-t border-gray-200 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div>
              <span className="font-bold text-gray-900">{cartItemsCount} {cartItemsCount === 1 ? 'item' : 'items'}</span>
              <span className="mx-2">•</span>
              <span className="font-bold text-gray-900">${cartTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={() => navigate('/cart')}
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-900 transition-colors"
            >
              View Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage; 