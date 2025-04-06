import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { userModel } from '../schemas/userSchema.js';
import logger from '../config/logger.js';
import { blacklistToken } from '../middlewares/authMiddleware.js';
import { generateRandomPassword } from '../utils/passwordUtils.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Generate JWT token
 * @param {String} userId - User ID to include in token
 * @returns {String} JWT token
 */
const generateToken = (userId) => {
  // Ensure userId is properly converted to string to avoid ObjectId casting issues
  const id = String(userId);
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

/**
 * Generate refresh token
 * @param {String} userId - User ID to include in token
 * @returns {String} Refresh token
 */
const generateRefreshToken = (userId) => {
  // Ensure userId is properly converted to string to avoid ObjectId casting issues
  const id = String(userId);
  return jwt.sign(
    { id },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
};

/**
 * Send JWT token in a cookie
 * @param {Response} res - Express response object
 * @param {String} token - JWT token
 */
const sendTokenCookie = (res, token) => {
  // Set cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES_IN || 900) * 1000), // 15 minutes in milliseconds
    httpOnly: true, // Cannot be accessed by client-side JS
    secure: process.env.NODE_ENV === 'production', // Only sent on HTTPS in production
    sameSite: 'strict' // Protection against CSRF
  };

  // Log cookie details for debugging
  logger.debug('Setting token cookie with options', {
    expiresIn: cookieOptions.expires,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    token: token ? `${token.substring(0, 10)}...` : 'none'
  });
  
  res.cookie('token', token, cookieOptions);
};

/**
 * Send refresh token in a cookie
 * @param {Response} res - Express response object
 * @param {String} token - Refresh token
 */
const sendRefreshTokenCookie = (res, token) => {
  // Set cookie options with longer expiry
  const cookieOptions = {
    expires: new Date(Date.now() + parseInt(process.env.REFRESH_TOKEN_COOKIE_EXPIRES_IN || 604800) * 1000), // 7 days in milliseconds
    httpOnly: true, // Cannot be accessed by client-side JS
    secure: process.env.NODE_ENV === 'production', // Only sent on HTTPS in production
    sameSite: 'strict' // Protection against CSRF
  };

  // Log cookie details for debugging
  logger.debug('Setting refresh token cookie with options', {
    expiresIn: cookieOptions.expires,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    token: token ? `${token.substring(0, 10)}...` : 'none'
  });
  
  res.cookie('refreshToken', token, cookieOptions);
};

/**
 * Generate CSRF token for protection against CSRF attacks
 * This token is sent to the client and must be included in requests
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req, res) => {
  try {
    const { username, fullName, email, password, role = 'customer' } = req.body;

    // Check if email exists
    const emailExists = await userModel.findOne({ email });
    if (emailExists) {
      logger.warn(`Registration failed: Email ${email} already exists`);
      return res.status(409).json({
        status: 'error',
        message: 'Email already in use'
      });
    }

    // Check if username exists
    const usernameExists = await userModel.findOne({ username });
    if (usernameExists) {
      logger.warn(`Registration failed: Username ${username} already exists`);
      return res.status(409).json({
        status: 'error',
        message: 'Username already in use'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user in database
    const newUser = await userModel.create({
      username,
      fullName,
      email,
      password: hashedPassword,
      role
    });

    logger.info(`New user registered: ${email}`);

    // Send success response
    res.status(201).json({
      status: 'success',
      message: 'Registration successful',
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to register user'
    });
  }
};

/**
 * Login a user
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
      logger.warn(`Login failed: Missing credentials`);
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }

    // Find user by email
    const user = await userModel.findOne({ email }).select('+password');
    
    // Check if user exists and password is correct
    if (!user || !(await bcrypt.compare(password, user.password))) {
      logger.warn(`Login failed: Invalid credentials for ${email}`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      logger.warn(`Login failed: Account deactivated for ${email}`);
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }
    
    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Generate CSRF token
    const csrfToken = generateCSRFToken();
    
    // Save refresh token and CSRF token to user
    user.refreshToken = refreshToken;
    user.csrfToken = csrfToken;
    user.lastLogin = new Date();
    await user.save();
    
    // Send tokens in cookies
    sendTokenCookie(res, token);
    sendRefreshTokenCookie(res, refreshToken);
    
    // Log successful login
    logger.info(`User logged in: ${email}`);
    
    // Send success response with user info and CSRF token
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      csrfToken,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to login'
    });
  }
};

/**
 * Logout a user
 * @route POST /api/auth/logout
 * @access Private
 */
export const logout = async (req, res) => {
  try {
    // Get token from cookies or authorization header
    const token = req.cookies.token || 
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer') 
        ? req.headers.authorization.split(' ')[1] 
        : null);

    // Check if user is authenticated from the protect middleware
    const userId = req.user?._id || req.user?.id;
    
    // Blacklist the token if it exists
    if (token) {
      blacklistToken(token);
    }

    // Clear cookies regardless of token presence
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/'
    });
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/api/auth/refresh-token'
    });

    // Clear user's refresh token in database
    if (userId) {
      try {
        // Use findOne instead of findById to handle both numeric and ObjectId formats
        const user = await userModel.findOne({ _id: userId });
        
        if (user) {
          user.refreshToken = null;
          await user.save();
          logger.info(`User logged out: ${user.email}`);
        }
      } catch (dbError) {
        // Log the error but continue with the logout process
        logger.error(`Error updating refresh token during logout: ${dbError.message}`);
        // We still want to clear cookies even if DB update fails
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    // Still try to clear cookies on error
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to log out'
    });
  }
};

// Simple token refresh rate limiting using in-memory cache
// This helps prevent excessive refresh requests from the same client
const refreshAttempts = new Map(); // IP address -> { count, lastAttempt }
const MAX_REFRESH_ATTEMPTS = 5; // Maximum attempts in time window
const REFRESH_WINDOW = 60 * 1000; // 60 seconds time window
const REFRESH_COOLDOWN = 30 * 1000; // 30 seconds cooldown after max attempts

/**
 * Refresh access token using refresh token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
export const refreshToken = async (req, res) => {
  try {
    // Get client IP for rate limiting
    const clientIP = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    
    // Check rate limiting
    const now = Date.now();
    const clientAttempts = refreshAttempts.get(clientIP) || { count: 0, lastAttempt: 0 };
    
    // Reset counter if window has passed
    if (now - clientAttempts.lastAttempt > REFRESH_WINDOW) {
      clientAttempts.count = 0;
    }
    
    // Increment attempt counter
    clientAttempts.count += 1;
    clientAttempts.lastAttempt = now;
    refreshAttempts.set(clientIP, clientAttempts);
    
    // Check if exceeded max attempts
    if (clientAttempts.count > MAX_REFRESH_ATTEMPTS) {
      const timeToReset = Math.ceil((REFRESH_COOLDOWN - (now - clientAttempts.lastAttempt)) / 1000);
      logger.warn(`Rate limit exceeded for token refresh: ${clientIP}, attempts: ${clientAttempts.count}`);
      return res.status(429).json({
        status: 'error',
        message: `Too many refresh attempts. Please try again in ${timeToReset} seconds.`
      });
    }
    
    // Get refresh token from cookies or request body
    const tokenFromCookie = req.cookies.refreshToken;
    const tokenFromBody = req.body.refreshToken;
    const refreshToken = tokenFromCookie || tokenFromBody;

    if (!refreshToken) {
      logger.warn(`Refresh token missing from both cookie and request body`);
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required. Please login again.'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      logger.warn(`Invalid refresh token`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token'
      });
    }

    // Find user by id and check if refresh token matches
    let user;
    try {
      // Use findOne instead of findById to handle both numeric and ObjectId formats
      user = await userModel.findOne({ 
        _id: decoded.id,
        refreshToken: refreshToken,
        isActive: true
      });
    } catch (error) {
      logger.error(`Error finding user for refresh token: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error processing refresh token'
      });
    }

    if (!user) {
      logger.warn(`Refresh token failed: Token not found in database or user inactive`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    const newCsrfToken = generateCSRFToken();

    // Update refresh token in database
    try {
      user.refreshToken = newRefreshToken;
      await user.save();
      
      // Reset attempt counter on successful refresh
      clientAttempts.count = 0;
      refreshAttempts.set(clientIP, clientAttempts);
      
      // Set cookies
      sendTokenCookie(res, newAccessToken);
      sendRefreshTokenCookie(res, newRefreshToken);
      
      logger.info(`Token refreshed for user: ${user.email}`);

      // Send response with new CSRF token
      res.status(200).json({
        status: 'success',
        csrfToken: newCsrfToken
      });
    } catch (error) {
      logger.error(`Error saving new refresh token: ${error.message}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to refresh token'
      });
    }
  } catch (error) {
    logger.error(`Refresh token error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to refresh token'
    });
  }
};

/**
 * Change user password
 * @route POST /api/auth/change-password
 * @access Private
 */
export const changePassword = async (req, res) => {
  try {
    console.log('Password change attempt initiated');
    const { currentPassword, newPassword } = req.body;
    
    // Debug logging
    console.log(`Request user ID: ${req.user.id || req.user._id}`);
    console.log(`Password validation - Current password provided: ${!!currentPassword}, New password provided: ${!!newPassword}`);
    
    // Find user - use findOne with _id for both numeric and ObjectId IDs
    // Make sure to look for both possible ID fields
    const userIdToFind = req.user.id || req.user._id;
    console.log(`Looking for user with ID: ${userIdToFind}`);
    
    const user = await userModel.findOne({ 
      $or: [
        { _id: userIdToFind },
        { id: userIdToFind }
      ]
    });
    
    if (!user) {
      console.log(`User not found with ID: ${userIdToFind}`);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    console.log(`User found: ${user.email}`);
    
    // Verify current password
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    
    console.log(`Password verification result: ${isPasswordCorrect}`);
    
    if (!isPasswordCorrect) {
      logger.warn(`Password change failed: Incorrect current password for ${user.email}`);
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect current password'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    logger.info(`Password changed successfully for user: ${user.email}`);
    console.log(`Password updated successfully for user: ${user.email}`);
    
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error(`Password change error details: ${error.message}`, error);
    logger.error(`Password change error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password',
      details: error.message
    });
  }
};

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await userModel.findOne({ email });
    
    if (!user) {
      // Don't reveal user existence, but log the attempt
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return res.status(200).json({
        status: 'success',
        message: 'If your email is registered, you will receive a password reset link'
      });
    }
    
    // Generate token
    const resetToken = uuidv4();
    
    // Set token expiration (1 hour)
    const expiresIn = new Date(Date.now() + 60 * 60 * 1000);
    
    // Save to database
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = expiresIn;
    await user.save();
    
    // In a real app, send email with reset link
    logger.info(`Password reset requested for: ${email}`);
    
    res.status(200).json({
      status: 'success',
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process password reset request'
    });
  }
};

/**
 * Reset password with token
 * @route POST /api/auth/reset-password
 * @access Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Find user with valid token
    const user = await userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      logger.warn(`Password reset failed: Invalid or expired token`);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired password reset token'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear reset token and expiry
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    
    // Invalidate all sessions
    user.refreshToken = null;
    
    await user.save();
    
    logger.info(`Password reset successful for: ${user.email}`);
    
    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully. Please log in with your new password.'
    });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset password'
    });
  }
};

/**
 * Get current user info
 * @route GET /api/auth/me
 * @access Private
 */
export const getMe = async (req, res) => {
  try {
    // User is already attached to the request by the protect middleware
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated'
      });
    }

    logger.info(`User ${req.user.email} accessed their profile`);

    res.status(200).json({
      status: 'success',
      user: {
        id: req.user._id,
        username: req.user.username,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    logger.error(`Get user profile error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile'
    });
  }
};
