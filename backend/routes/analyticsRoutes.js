import express from 'express';
import { protect, isAdmin } from '../middlewares/authMiddleware.js';
import { 
  getSalesAnalytics, 
  getMenuItemsAnalytics, 
  getCustomerAnalytics, 
  getInventoryAnalytics, 
  getFeedbackAnalytics,
  getDashboardAnalytics 
} from '../Controllers/analyticsController.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/analytics/sales:
 *   get:
 *     summary: Get sales analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, custom]
 *         description: Time period for analytics
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Sales analytics data
 *       401:
 *         description: Unauthorized
 */
router.get('/sales', protect, isAdmin, cacheMiddleware(900), getSalesAnalytics);

/**
 * @swagger
 * /api/analytics/menu-items:
 *   get:
 *     summary: Get item popularity analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, custom]
 *         description: Time period for analytics
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Item popularity analytics data
 *       401:
 *         description: Unauthorized
 */
router.get('/menu-items', protect, isAdmin, cacheMiddleware(900), getMenuItemsAnalytics);

/**
 * @swagger
 * /api/analytics/customers:
 *   get:
 *     summary: Get customer analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, custom]
 *         description: Time period for analytics
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Customer analytics data
 *       401:
 *         description: Unauthorized
 */
router.get('/customers', protect, isAdmin, cacheMiddleware(900), getCustomerAnalytics);

/**
 * @swagger
 * /api/analytics/inventory:
 *   get:
 *     summary: Get inventory analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory analytics data
 *       401:
 *         description: Unauthorized
 */
router.get('/inventory', protect, isAdmin, cacheMiddleware(300), getInventoryAnalytics);

/**
 * @swagger
 * /api/analytics/feedback:
 *   get:
 *     summary: Get feedback analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for period
 *     responses:
 *       200:
 *         description: Feedback analytics data
 *       401:
 *         description: Unauthorized
 */
router.get('/feedback', protect, isAdmin, cacheMiddleware(1800), getFeedbackAnalytics);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics data
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', protect, isAdmin, cacheMiddleware(300), getDashboardAnalytics);

export default router; 