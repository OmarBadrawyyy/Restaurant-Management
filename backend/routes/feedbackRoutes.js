// feedbackRoutes.js
import express from 'express';
import { isAdmin, protect } from '../middlewares/authMiddleware.js';
import { submitFeedback, viewAllFeedback, getUserFeedbackHistory } from '../Controllers/feedbackController.js';
import { feedbackLimiter } from '../middlewares/rateLimitMiddleware.js';
import { validateFeedbackInput } from '../middlewares/validationMiddleware.js';
import { 
  requestTimeout,
  requestSlowdown,
  detectSuspiciousActivity 
} from '../middlewares/securityMiddleware.js';

const router = express.Router();

// Debug middleware for feedback routes
router.use((req, res, next) => {
  console.log(`[FEEDBACK ROUTE] ${req.method} ${req.originalUrl} (${req.path})`);
  next();
});

// Add a test endpoint
router.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.status(200).json({ message: 'Feedback routes working correctly' });
});

// Apply feedback-specific rate limiting and security
router.use(feedbackLimiter);    // Use specific limiter instead of general apiRateLimiter
router.use(requestTimeout);
router.use(requestSlowdown);

// POST /api/feedback - Submit feedback
router.post('/', 
  protect,
  detectSuspiciousActivity,
  validateFeedbackInput,
  submitFeedback
);

// GET /api/feedback - View all feedback (admin only)
router.get('/', 
  protect,
  isAdmin,
  viewAllFeedback
);

// GET /api/feedback/my-history - Get current user's feedback history
router.get('/my-history', protect, (req, res, next) => {
  console.log('User feedback history route hit', { 
    userId: req.user?._id,
    path: req.path,
    url: req.originalUrl 
  });
  next();
}, getUserFeedbackHistory);

// Log all registered routes for debugging
console.log('Feedback routes registered:');
router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    const methods = Object.keys(r.route.methods).join(',').toUpperCase();
    console.log(`${methods} /api/feedback${r.route.path}`);
  }
});

export default router;
