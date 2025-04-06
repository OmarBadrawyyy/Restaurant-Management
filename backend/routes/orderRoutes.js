// backend/routes/orderRoutes.js

import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { csrfProtection, handleCSRFError } from '../middlewares/csrfMiddleware.js';
import { validateObjectIds } from '../middlewares/validationMiddleware.js';
import {
  getOrderStatusCounts,
  getAllOrders,
  retryFetchOrders,
  getOrderById,
  updateOrderStatus,
  createOrder,
  cancelOrder,
  deleteOrder
} from '../Controllers/orderController.js';

const router = express.Router();

// Apply CSRF protection to all routes conditionally
const conditionalCSRF = (req, res, next) => {
  // Skip CSRF in development with bypass parameter
  if (process.env.NODE_ENV === 'development' && req.query.bypassCsrf === 'true') {
    console.log('Bypassing CSRF for development');
    return next();
  }
  // Otherwise apply CSRF protection
  return csrfProtection(req, res, next);
};

// Error handler for CSRF
router.use(handleCSRFError);

// Protected routes
router.use(protect); 

// Retry endpoint must come before :id route to avoid being treated as an ID
router.get('/retry', retryFetchOrders);

// Customer routes
router.post('/', conditionalCSRF, createOrder);
router.get('/', getAllOrders);
router.get('/:id', validateObjectIds, getOrderById);
router.put('/:id/cancel', validateObjectIds, cancelOrder);

// Admin/Manager only routes
router.put('/:id/status', validateObjectIds, restrictTo(['admin', 'manager']), updateOrderStatus);

// Standard CRUD
router.delete('/:id', validateObjectIds, deleteOrder);

export default router;