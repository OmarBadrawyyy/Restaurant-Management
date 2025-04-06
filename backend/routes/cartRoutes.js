import { 
    addItemToCart, 
    removeItemFromCart, 
    updateCartItemQuantity, 
    getUserCart, 
    clearCart, 
    applyPromotion, 
    updateDeliveryInfo 
} from "../Controllers/cartController.js";
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { cartRateLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Apply rate limiting to all cart routes
router.use(cartRateLimiter);

// Cart management routes
router.post('/add', protect, addItemToCart);
router.delete('/remove/:itemId', protect, removeItemFromCart);
router.put('/update-quantity', protect, updateCartItemQuantity);
router.get('/', protect, getUserCart);
router.delete('/clear', protect, clearCart);
router.post('/apply-promotion', protect, applyPromotion);
router.put('/delivery-info', protect, updateDeliveryInfo);

export default router;
