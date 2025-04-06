import { userModel } from '../schemas/userSchema.js';
import { menuItemModel } from '../schemas/menuItemSchema.js';
import { cartModel } from '../schemas/cartSchema.js';
import logger from '../config/logger.js';

// Add item to cart
export const addItemToCart = async (req, res) => {
    try {
        const userId = req.user._id; // Get user ID from authenticated request
        const { menuItemId, quantity, specialInstructions, customizations } = req.body;

        if (!menuItemId) {
            return res.status(400).json({ message: 'Menu item ID is required' });
        }

        // Find the menu item
        const menuItem = await menuItemModel.findById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        // Check if item is available
        if (!menuItem.isAvailable) {
            return res.status(400).json({ message: 'This item is currently unavailable' });
        }

        // Find user's cart or create a new one
        let cart = await cartModel.findOne({ userId });
        if (!cart) {
            cart = new cartModel({ userId, items: [] });
        }

        // Add item to cart
        cart.addItem(menuItem, quantity || 1, specialInstructions || '', customizations || []);
        await cart.save();

        res.status(200).json({ 
            message: 'Item added to cart', 
            cart: cart 
        });
    } catch (error) {
        logger.error(`Error adding item to cart: ${error.message}`, { userId: req.user?._id, menuItemId: req.body?.menuItemId });
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Remove item from cart
export const removeItemFromCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { itemId } = req.params;

        if (!itemId) {
            return res.status(400).json({ message: 'Item ID is required' });
        }

        // Find user's cart
        const cart = await cartModel.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Remove item from cart
        cart.removeItem(itemId);
        await cart.save();

        res.status(200).json({ 
            message: 'Item removed from cart', 
            cart: cart 
        });
    } catch (error) {
        logger.error(`Error removing item from cart: ${error.message}`, { userId: req.user?._id, itemId: req.params?.itemId });
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Update item quantity
export const updateCartItemQuantity = async (req, res) => {
    try {
        const userId = req.user._id;
        const { itemId, quantity } = req.body;

        if (!itemId || quantity === undefined) {
            return res.status(400).json({ message: 'Item ID and quantity are required' });
        }

        // Find user's cart
        const cart = await cartModel.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Update item quantity
        cart.updateItemQuantity(itemId, quantity);
        await cart.save();

        res.status(200).json({ 
            message: 'Cart item quantity updated', 
            cart: cart 
        });
    } catch (error) {
        logger.error(`Error updating cart item quantity: ${error.message}`, { 
            userId: req.user?._id, 
            itemId: req.body?.itemId,
            quantity: req.body?.quantity 
        });
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Get user's cart
export const getUserCart = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Find user's cart
        const cart = await cartModel.findOne({ userId })
            .populate('items.menuItemId', 'name price image description');

        if (!cart) {
            return res.status(200).json({ 
                message: 'Cart is empty', 
                cart: { userId, items: [], totalAmount: 0, finalAmount: 0 } 
            });
        }

        res.status(200).json({ 
            message: 'Cart retrieved successfully', 
            cart: cart,
            source: 'database'
        });
    } catch (error) {
        logger.error(`Error getting user cart: ${error.message}`, { userId: req.user?._id });
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Clear cart
export const clearCart = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find user's cart
        const cart = await cartModel.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Clear cart
        cart.clearCart();
        await cart.save();

        res.status(200).json({ 
            message: 'Cart cleared successfully', 
            cart: cart 
        });
    } catch (error) {
        logger.error(`Error clearing cart: ${error.message}`, { userId: req.user?._id });
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Apply promotion to cart
export const applyPromotion = async (req, res) => {
    try {
        const userId = req.user._id;
        const { promotionCode } = req.body;

        if (!promotionCode) {
            return res.status(400).json({ message: 'Promotion code is required' });
        }

        // Find user's cart
        const cart = await cartModel.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Find promotion by code
        const promotion = await promotionModel.findOne({ 
            code: promotionCode.toUpperCase(),
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        if (!promotion) {
            return res.status(404).json({ message: 'Invalid or expired promotion code' });
        }

        try {
            // Apply promotion to cart
            cart.applyPromotion(promotion);
            await cart.save();

            res.status(200).json({ 
                message: 'Promotion applied successfully', 
                cart: cart 
            });
        } catch (error) {
            // Handle validation errors from the applyPromotion method
            return res.status(400).json({ message: error.message });
        }
    } catch (error) {
        logger.error(`Error applying promotion: ${error.message}`, { 
            userId: req.user?._id,
            promotionCode: req.body?.promotionCode
        });
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Update delivery information
export const updateDeliveryInfo = async (req, res) => {
    try {
        const userId = req.user._id;
        const { deliveryType, deliveryAddress, tableNumber, specialInstructions } = req.body;

        // Find user's cart
        const cart = await cartModel.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Update delivery information
        if (deliveryType) cart.deliveryType = deliveryType;
        if (deliveryAddress) cart.deliveryAddress = deliveryAddress;
        if (tableNumber) cart.tableNumber = tableNumber;
        if (specialInstructions) cart.specialInstructions = specialInstructions;

        await cart.save();
        
        res.status(200).json({ 
            message: 'Delivery information updated', 
            cart: cart 
        });
    } catch (error) {
        logger.error(`Error updating delivery information: ${error.message}`, { userId: req.user?._id });
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};