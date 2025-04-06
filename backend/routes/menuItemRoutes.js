import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import {
  createMenuItem,
  getAllMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
  getMenuItemsByCategory,
  getFeaturedItems
} from '../Controllers/menuItemController.js';
import { validateIdParam } from '../middlewares/validationMiddleware.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * Request logging middleware
 */
const logRequest = (req, res, next) => {
  logger.info(`Menu Item API Request: ${req.method} ${req.originalUrl}`, {
    userId: req.user?.id,
    role: req.user?.role,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  next();
};

// Apply logging middleware to all routes
router.use(logRequest);

// Public routes (no auth required)
router.get('/', getAllMenuItems);
router.get('/featured', getFeaturedItems);
router.get('/category/:categoryId', getMenuItemsByCategory);
router.get('/:id', validateIdParam, getMenuItemById);

// Protected routes (requires authentication)
router.use(protect);

// Admin/Manager only routes
router.post(
  '/', 
  restrictTo(['admin', 'manager']), 
  createMenuItem
);

router.put(
  '/:id', 
  validateIdParam, 
  restrictTo(['admin', 'manager']), 
  updateMenuItem
);

router.delete(
  '/:id', 
  validateIdParam, 
  restrictTo(['admin', 'manager']), 
  deleteMenuItem
);

export default router;
