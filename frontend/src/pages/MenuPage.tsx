import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import menuService, { MenuItem, Category } from '../services/menuService';
import { useCart } from '../context/CartContext';

const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, addToCart: addItemToCart, getItemCount, getSubtotal } = useCart();
  const menuRef = useRef<HTMLDivElement>(null);
  
  // State for menu items and categories
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
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

  // Scroll behavior for section navigation
  useEffect(() => {
    if (activeSection) {
      const element = document.getElementById(activeSection);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activeSection]);
  
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
    
    toast.success(`${menuItem.name} added to cart!`, {
      icon: '🍽️',
      duration: 2000,
      position: 'bottom-center',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
  };
  
  // Calculate cart values from context
  const cartItemsCount = getItemCount();
  const cartTotal = getSubtotal();
  
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading menu items...</p>
        </div>
      </div>
    );
  }
  
  if (error || menuItems.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-xl shadow-md p-8 max-w-lg mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Menu Unavailable</h1>
            <p className="text-gray-600 mb-6">{error || 'No menu items available'}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get unique categories for navigation
  const menuCategories = Object.keys(groupedMenuItems);
  
  return (
    <div className="bg-gray-50 min-h-screen pb-24" ref={menuRef}>
      {/* Header with navigation and cart button */}
      <div className="sticky top-0 z-10 bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/customer')}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Back to dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Our Menu</h1>
            </div>
            <button
              onClick={() => navigate('/cart')}
              className="relative flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              aria-label="View cart"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>View Cart</span>
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Category Navigation */}
        <div className="bg-gray-100 overflow-x-auto">
          <div className="container mx-auto px-4">
            <div className="flex space-x-2 py-3">
              {menuCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveSection(category)}
                  className={`px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                    activeSection === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for dishes..."
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="md:w-1/3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
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
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedMenuItems).map(([categoryName, items]) => (
              <div key={categoryName} id={categoryName} className="scroll-mt-32">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="mr-2">{categoryName}</span>
                  <div className="h-0.5 flex-grow bg-gray-200 ml-3"></div>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map(item => (
                    <div 
                      key={item.id} 
                      className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 transition-all hover:shadow-md"
                    >
                      {item.imageUrl && (
                        <div className="h-48 bg-gray-100 overflow-hidden">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover transition-transform hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                          <span className="font-bold text-blue-600">${item.price.toFixed(2)}</span>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
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
        <div className="fixed bottom-0 inset-x-0 bg-white shadow-lg border-t border-gray-200 p-4 z-10">
          <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center">
              <div className="bg-blue-100 text-blue-600 rounded-full h-10 w-10 flex items-center justify-center mr-3">
                <span className="font-bold">{cartItemsCount}</span>
              </div>
              <div>
                <p className="font-medium">Your order</p>
                <p className="text-lg font-bold text-blue-600">${cartTotal.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/cart')}
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              View Cart
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage; 