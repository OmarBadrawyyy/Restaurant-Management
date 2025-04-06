import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { CartItem, getCartFromStorage, saveCartToStorage, clearCartFromStorage } from '../types/cart';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  reloadCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart on initial render
  useEffect(() => {
    console.log('CartContext - Loading initial cart from localStorage');
    const loadedCart = getCartFromStorage();
    console.log('CartContext - Loaded cart data:', loadedCart);
    setCart(loadedCart);
  }, []);

  // Save cart whenever it changes
  useEffect(() => {
    console.log('CartContext - Cart state changed, saving. Items:', cart.length);
    saveCartToStorage(cart);
  }, [cart]);

  // Add item to cart
  const addToCart = (newItem: CartItem) => {
    setCart(prevCart => {
      // Check if item already exists in cart
      const existingItemIndex = prevCart.findIndex(item => item.itemId === newItem.itemId);
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + newItem.quantity
        };
        toast.success(`Added another ${newItem.name} to your cart`);
        return updatedCart;
      } else {
        // Add new item to cart
        toast.success(`Added ${newItem.name} to your cart`);
        return [...prevCart, newItem];
      }
    });
  };

  // Update item quantity
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setCart(prevCart => 
      prevCart.map(item => 
        item.itemId === itemId ? { ...item, quantity } : item
      )
    );
  };

  // Remove item from cart
  const removeItem = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.itemId !== itemId));
    toast.success('Item removed from cart');
  };

  // Clear cart
  const clearCart = () => {
    console.log('CartContext - Clearing cart');
    try {
      setCart([]);
      clearCartFromStorage();
      console.log('CartContext - Cart cleared successfully');
      toast.success('Cart cleared');
    } catch (error) {
      console.error('CartContext - Error clearing cart:', error);
    }
  };

  // Force reload cart from localStorage
  const reloadCart = () => {
    console.log('CartContext - Force reloading cart from localStorage');
    const loadedCart = getCartFromStorage();
    console.log('CartContext - Force reloaded cart data:', loadedCart);
    setCart(loadedCart);
  };

  // Get total item count
  const getItemCount = (): number => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  // Calculate subtotal
  const getSubtotal = (): number => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        reloadCart,
        getItemCount,
        getSubtotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Hook for using the cart context
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext; 