import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  register,
  login,
  logout,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe
} from '../Controllers/authController.js';
import {
  getUserProfile,
  updateUserProfile
} from '../Controllers/userController.js';
import validate from '../middlewares/validationMiddleware.js';
import { authSchemas } from '../schemas/validationSchemas.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Debug middleware for auth routes
const debugAuthRequest = (req, res, next) => {
  console.log(`=== DEBUG AUTH REQUEST: ${req.method} ${req.path} ===`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Cookies:', req.cookies);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
};

// Apply debug middleware to all auth routes in development
if (process.env.NODE_ENV === 'development') {
  router.use(debugAuthRequest);
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [customer, staff, manager, admin]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email or username already exists
 */
router.post('/register', validate(authSchemas.register), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 user:
 *                   type: object
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(authSchemas.login), login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout a user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', logout);

// Basic cookie test route
router.get('/cookie-test', (req, res) => {
  // Check for existing cookies
  console.log('Cookies received:', req.cookies);
  
  // Set a test cookie
  res.cookie('test_cookie', 'cookie_value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 5 * 60 * 1000 // 5 minutes
  });
  
  res.json({
    status: 'success',
    message: 'Cookie test route',
    cookiesReceived: Object.keys(req.cookies),
    cookieSet: 'test_cookie'
  });
});

// Debug refresh token route (for development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/debug-token', (req, res) => {
    // Generate a refresh token for test user
    const testUserId = '507f1f77bcf86cd799439011'; // admin user ID
    const refreshToken = jwt.sign(
      { id: testUserId },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Set as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour
      path: '/api/auth/refresh-token'
    });
    
    res.json({
      status: 'success',
      message: 'Debug refresh token set',
      cookieSet: true,
      userId: testUserId,
      info: 'You can now call /api/auth/refresh-token to test the refresh flow'
    });
  });
}

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Not authenticated
 */
router.get('/me', protect, (req, res) => {
  res.json({
    status: 'success',
    user: {
      _id: req.user._id,
      email: req.user.email,
      username: req.user.username || req.user.name,
      role: req.user.role,
      isActive: req.user.isActive
    }
  });
});

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 */
router.post('/refresh-token', validate(authSchemas.refreshToken), refreshToken);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 */
router.post('/change-password', protect, validate(authSchemas.changePassword), changePassword);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: If email exists, reset instructions sent
 */
router.post('/forgot-password', validate(authSchemas.forgotPassword), forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', validate(authSchemas.resetPassword), resetPassword);

/**
 * @swagger
 * /api/auth/csrf-token:
 *   get:
 *     summary: Get CSRF token
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: CSRF token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 */
router.get('/csrf-token', (req, res) => {
  try {
    // Generate a CSRF token using crypto
    const crypto = require('crypto');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    // Set the token in a cookie
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false, // Must be accessible from JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Also send in response
    res.status(200).json({ csrfToken });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({ message: 'Failed to generate CSRF token' });
  }
});

// Protected routes - require authentication
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

export default router;
