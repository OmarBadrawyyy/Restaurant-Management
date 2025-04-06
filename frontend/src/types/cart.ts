// Define shared types for cart functionality
export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

// Define localStorage key as a constant to ensure consistency
export const CART_STORAGE_KEY = 'restaurant-cart';

// Helper functions for cart operations - improved robustness
export const saveCartToStorage = (cart: CartItem[]): void => {
  try {
    // Create a deep copy to prevent reference issues
    const cartCopy = JSON.parse(JSON.stringify(cart));
    const cartJson = JSON.stringify(cartCopy);
    
    // Log for debugging
    console.log(`Saving cart to localStorage (${cartCopy.length} items)`);
    
    // First try to clear existing cart to avoid corruption
    localStorage.removeItem(CART_STORAGE_KEY);
    
    // Then save the new cart
    localStorage.setItem(CART_STORAGE_KEY, cartJson);
    
    // Verify the save
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart || savedCart !== cartJson) {
      console.warn('Cart verification failed, trying again with delay');
      // Try one more time with a small delay
      setTimeout(() => {
        localStorage.setItem(CART_STORAGE_KEY, cartJson);
      }, 50);
    }
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
};

export const getCartFromStorage = (): CartItem[] => {
  try {
    // Get cart from localStorage
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    
    // If cart doesn't exist, return empty array
    if (!savedCart) {
      console.log('No cart found in localStorage, returning empty cart');
      return [];
    }
    
    // Try to parse cart
    try {
      const parsedCart = JSON.parse(savedCart);
      
      // Validate cart structure
      if (!Array.isArray(parsedCart)) {
        console.error('Cart data is not an array, resetting cart');
        clearCartFromStorage();
        return [];
      }
      
      // Check for valid cart items
      const validCart = parsedCart.filter(item => {
        return (
          item && 
          typeof item === 'object' && 
          'itemId' in item && 
          'name' in item && 
          'price' in item && 
          'quantity' in item
        );
      });
      
      // If items were filtered out, save the valid cart
      if (validCart.length !== parsedCart.length) {
        console.warn(`Removed ${parsedCart.length - validCart.length} invalid items from cart`);
        saveCartToStorage(validCart);
      }
      
      console.log(`Retrieved cart from localStorage with ${validCart.length} items`);
      return validCart;
    } catch (parseError) {
      console.error('Failed to parse cart JSON:', parseError);
      clearCartFromStorage();
      return [];
    }
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return [];
  }
};

export const clearCartFromStorage = (): void => {
  try {
    console.log('Clearing cart from localStorage');
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear cart from localStorage:', error);
  }
};

// Check if localStorage is available
export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = 'test-local-storage';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.error('localStorage is not available:', error);
    return false;
  }
}; 