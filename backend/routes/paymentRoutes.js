import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { 
  createPayment,
  confirmPayment,
  handlePaymentWebhook,
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  getPaymentHistory
} from '../Controllers/paymentController.js';
import { paymentLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Webhook route - no authentication required but has special parsing
router.post('/webhook', express.raw({ type: 'application/json' }), handlePaymentWebhook);

// All other routes require authentication
router.use(protect);

// Apply rate limiting to all payment routes except webhook
router.use((req, res, next) => {
  if (req.path !== '/webhook') {
    return paymentLimiter(req, res, next);
  }
  next();
});

// Payment processing routes
router.post('/create-payment', createPayment);
router.post('/confirm-payment', confirmPayment);

// Payment methods management
router.get('/methods', getPaymentMethods);
router.post('/methods', addPaymentMethod);
router.put('/methods/:id/default', setDefaultPaymentMethod);
router.delete('/methods/:id', deletePaymentMethod);

// Payment history
router.get('/history', getPaymentHistory);

export default router; 