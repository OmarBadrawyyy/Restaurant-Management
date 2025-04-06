import express from 'express';
import tableController from '../Controllers/tableController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { validateIdParam, validateTableInput, validateObjectIds } from '../middlewares/validationMiddleware.js';
import { requestTimeout, detectSuspiciousActivity, csrfProtection } from '../middlewares/securityMiddleware.js';
import { tableLimiter } from '../middlewares/rateLimitMiddleware.js';
import { cacheMiddleware, clearCache } from '../middlewares/cacheMiddleware.js';
import logger from '../config/logger.js';

const router = express.Router();

// Cache keys for table data
const CACHE_KEYS = {
    AVAILABLE_TABLES: 'availableTables',
    ALL_TABLES: 'allTables'
};

// Request logging middleware
const logRequest = (req, res, next) => {
    logger.info(`Table API Request: ${req.method} ${req.originalUrl}`, {
        userId: req.user?.id,
        role: req.user?.role,
        params: req.params,
        query: req.query,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, -5)
    });
    next();
};

// Apply security middlewares to all routes
router.use(tableLimiter);
router.use(requestTimeout);
router.use(logRequest);

// Public route - get available tables (accessible without authentication)
router.get('/available', 
    cacheMiddleware('30s', CACHE_KEYS.AVAILABLE_TABLES), 
    tableController.getAvailableTables
);

// Protected routes - require authentication
router.use(protect);

// Routes accessible by admin and manager
router.use(restrictTo('admin', 'manager'));

// Get all tables
router.get('/', 
    cacheMiddleware('1m', CACHE_KEYS.ALL_TABLES), 
    tableController.getAllTables
);

// Create a new table
router.post('/', [
    csrfProtection,
    validateTableInput,
    clearCache([CACHE_KEYS.AVAILABLE_TABLES, CACHE_KEYS.ALL_TABLES]),
    tableController.createTable
]);

// Get, update and delete specific table
router.route('/:tableNumber')
    .get(validateIdParam, tableController.getTableById)
    .put([
        csrfProtection,
        validateIdParam,
        validateTableInput,
        clearCache([CACHE_KEYS.AVAILABLE_TABLES, CACHE_KEYS.ALL_TABLES]),
        tableController.updateTable
    ])
    .patch([
        csrfProtection,
        validateIdParam,
        clearCache([CACHE_KEYS.AVAILABLE_TABLES, CACHE_KEYS.ALL_TABLES]),
        tableController.updateTableStatus
    ])
    .delete([
        csrfProtection,
        validateIdParam,
        detectSuspiciousActivity,
        clearCache([CACHE_KEYS.AVAILABLE_TABLES, CACHE_KEYS.ALL_TABLES]),
        tableController.removeTable
    ]);

// Error handling middleware
router.use((err, req, res, next) => {
    // Log error details
    logger.error('Table API Error:', {
        error: err.message,
        stack: err.stack,
        user: req.user?.id,
        path: req.originalUrl
    });

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid table data',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }
    
    if (err.name === 'CastError') {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid table number format'
        });
    }
    
    if (err.name === 'NotFoundError') {
        return res.status(404).json({
            status: 'error',
            message: 'Table not found'
        });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(403).json({
            status: 'error',
            message: 'Not authorized to perform this action'
        });
    }
    
    if (err.name === 'CSRF_ERROR') {
        return res.status(403).json({
            status: 'error',
            message: 'Invalid or missing CSRF token'
        });
    }
    
    // Hide implementation details in production
    const isProduction = process.env.NODE_ENV === 'production';
    return res.status(500).json({
        status: 'error',
        message: isProduction ? 'An unexpected error occurred' : err.message
    });
});

export default router;
