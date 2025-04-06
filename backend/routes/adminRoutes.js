import express from 'express';
import { getAllUsers, createAdmin, updateUser, deleteUser, getDashboardStats } from '../Controllers/adminController.js';
import { protect, isAdmin, debugCustomerIssuesRequests, isAdminOrManager } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validationMiddleware.js';
import { userSchemas } from '../schemas/validationSchemas.js';
import { 
  getAllCustomerIssues, 
  getCustomerIssueById, 
  updateIssueStatus, 
  updateIssuePriority, 
  addIssueNote
} from '../Controllers/customerIssuesController.js';
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder
} from '../Controllers/orderController.js';
import mongoose from 'mongoose';
import { userModel } from '../schemas/userSchema.js';
import logger from '../config/logger.js';
import bcryptjs from 'bcryptjs';
import { validateObjectIds } from '../middlewares/validationMiddleware.js';
import { restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/', protect, isAdmin, getAllUsers);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/users', protect, isAdmin, getAllUsers);

/**
 * @swagger
 * /api/v1/admin:
 *   post:
 *     summary: Create a new admin user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               fullName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin user created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       409:
 *         description: User already exists
 */
router.post('/', protect, isAdmin, validate(userSchemas.register), createAdmin);

/**
 * @swagger
 * /api/v1/admin/{userId}:
 *   put:
 *     summary: Update a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, customer]
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: User not found
 */
router.put(
  '/users/:userId', 
  protect, 
  isAdminOrManager,  // Allow both admins and managers 
  async (req, res, next) => {
    // If user is a manager, check if they're updating a staff member
    if (req.user.role === 'manager') {
      try {
        const { userId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({
            message: 'Invalid user ID format'
          });
        }
        
        // Check if the target user is a staff member
        const user = await userModel.findById(userId);
        
        if (!user) {
          return res.status(404).json({
            message: 'User not found'
          });
        }
        
        // Managers can only update staff members
        if (user.role !== 'staff') {
          return res.status(403).json({
            message: 'Managers can only update staff members'
          });
        }
        
        // If changing role, deny access
        if (req.body.role && req.body.role !== user.role) {
          return res.status(403).json({
            message: 'Managers cannot change user roles'
          });
        }
        
        // Continue to the next middleware (skip validation for managers)
        return next();
      } catch (error) {
        logger.error(`Error checking user for manager update: ${error.message}`);
        return res.status(500).json({
          message: 'Failed to process update request',
          error: error.message
        });
      }
    }
    
    // If admin, continue to validation middleware
    return validate(userSchemas.update)(req, res, next);
  },
  updateUser
);

/**
 * @swagger
 * /api/v1/admin/{userId}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: User not found
 */
router.delete(
  '/users/:userId', 
  protect, 
  isAdmin, 
  deleteUser
);

/**
 * @swagger
 * /api/admin/users/{userId}/reset-password:
 *   post:
 *     summary: Reset a user's password (Admin and Manager)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to reset password
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 description: New password to set for the user
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.post('/users/:userId/reset-password', protect, isAdminOrManager, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    // Find the user
    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Managers can only reset passwords for staff members
    if (req.user.role === 'manager' && user.role !== 'staff') {
      return res.status(403).json({
        status: 'error',
        message: 'Managers can only reset passwords for staff members'
      });
    }
    
    // If a new password is provided, update it
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          status: 'error',
          message: 'Password must be at least 6 characters long'
        });
      }
      
      // Hash the password using the same method as other parts of the application
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(newPassword, salt);
      
      // Update the password directly with the hashed version
      user.password = hashedPassword;
      await user.save({ validateBeforeSave: true });
      
      logger.info(`Password updated for user ${user.email} by ${req.user.role} ${req.user.email}`);
      
      return res.status(200).json({
        status: 'success',
        message: 'Password updated successfully'
      });
    } else {
      // Generate random password
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // Hash the temporary password using the same method
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(tempPassword, salt);
      
      // Update with hashed password
      user.password = hashedPassword;
      await user.save({ validateBeforeSave: true });
      
      // In a real application, you would send an email with the temporary password
      logger.info(`Password reset for user ${user.email} by ${req.user.role} ${req.user.email}`);
      
      return res.status(200).json({
        status: 'success',
        message: 'Password reset successfully',
        tempPassword: tempPassword // In production, you'd email this instead of returning it
      });
    }
  } catch (error) {
    logger.error(`Password reset error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset password'
    });
  }
});

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/dashboard', protect, isAdmin, getDashboardStats);

/**
 * Customer Issues API Routes
 */

// Apply debug middleware to customer issues routes
router.use('/customer-issues', debugCustomerIssuesRequests);

// Get all customer issues
router.get('/customer-issues', protect, isAdminOrManager, getAllCustomerIssues);

// Get a specific customer issue
router.get('/customer-issues/:issueId', protect, isAdminOrManager, getCustomerIssueById);

// Update issue status
router.patch('/customer-issues/:issueId/status', protect, isAdminOrManager, updateIssueStatus);

// Update issue priority
router.patch('/customer-issues/:issueId/priority', protect, isAdminOrManager, updateIssuePriority);

// Add a note to an issue - Changed from patch to post to match frontend
router.post('/customer-issues/:issueId/notes', protect, isAdminOrManager, addIssueNote);

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders (Admin and Manager)
 *     tags: [Admin, Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by order status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: List of orders retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin/manager only)
 */
router.get('/orders', protect, isAdminOrManager, validateObjectIds, getAllOrders);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Get order by ID (Admin and Manager)
 *     tags: [Admin, Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin/manager only)
 *       404:
 *         description: Order not found
 */
router.get('/orders/:id', protect, isAdminOrManager, validateObjectIds, getOrderById);

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin and Manager)
 *     tags: [Admin, Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, preparing, ready, delivered, completed, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin/manager only)
 *       404:
 *         description: Order not found
 */
router.put('/orders/:id/status', protect, isAdminOrManager, validateObjectIds, updateOrderStatus);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   delete:
 *     summary: Delete order (Admin and Manager)
 *     tags: [Admin, Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin/manager only)
 *       404:
 *         description: Order not found
 */
router.delete('/orders/:id', protect, isAdminOrManager, validateObjectIds, deleteOrder);

/**
 * @swagger
 * /api/admin/users/staff:
 *   get:
 *     summary: Get all staff members (Admin and Manager)
 *     tags: [Admin, Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of staff members retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin/manager only)
 */
router.get('/users/staff', protect, isAdminOrManager, async (req, res) => {
  try {
    logger.info(`${req.user.role} ${req.user.email} requested staff list`);
    
    // Query all users that are staff or below (not admins)
    const staffUsers = await userModel.find({ 
      role: { $in: ['staff'] }
    }).select('-password');
    
    return res.status(200).json(staffUsers);
  } catch (error) {
    logger.error(`Error fetching staff: ${error.message}`);
    return res.status(500).json({
      message: 'Failed to fetch staff members',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new staff member (Admin and Manager)
 *     tags: [Admin, Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [staff]
 *     responses:
 *       201:
 *         description: Staff member created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.post('/users', protect, isAdminOrManager, async (req, res) => {
  try {
    const { username, email, password, phoneNumber } = req.body;
    
    // Managers can only create staff users
    if (req.user.role === 'manager' && req.body.role !== 'staff') {
      return res.status(403).json({
        message: 'Managers can only create staff members'
      });
    }
    
    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    
    // Create new user with staff role
    const newUser = new userModel({
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      role: 'staff',
      isActive: true,
      status: 'active'
    });
    
    // Save user to database
    const savedUser = await newUser.save();
    
    // Log the action
    logger.info(`New staff member created by ${req.user.role} ${req.user.email}: ${email}`);
    
    // Return the user without password
    const userWithoutPassword = { 
      ...savedUser.toObject(), 
      password: undefined 
    };
    
    return res.status(201).json({
      message: 'Staff member created successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    logger.error(`Error creating staff: ${error.message}`);
    return res.status(500).json({
      message: 'Failed to create staff member',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update a staff member (Admin and Manager)
 *     tags: [Admin, Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff member ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Staff member updated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Staff member not found
 */
router.put('/users/staff/:id', protect, isAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Make sure it's a valid object ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid user ID format'
      });
    }
    
    // Fetch the user to update
    const user = await userModel.findById(id);
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }
    
    // Only allow updating staff members
    if (user.role !== 'staff') {
      return res.status(403).json({
        message: 'This endpoint is only for updating staff members'
      });
    }
    
    // If role is being changed, make sure it's only by an admin
    if (updates.role && updates.role !== user.role && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can change user roles'
      });
    }
    
    // Update the user
    const updatedUser = await userModel.findByIdAndUpdate(
      id, 
      { ...updates }, 
      { new: true, runValidators: true }
    ).select('-password');
    
    logger.info(`Staff member ${id} updated by ${req.user.role} ${req.user.email}`);
    
    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    logger.error(`Error updating staff: ${error.message}`);
    return res.status(500).json({
      message: 'Failed to update staff member',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a staff member (Admin and Manager)
 *     tags: [Admin, Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff member ID
 *     responses:
 *       200:
 *         description: Staff member deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Staff member not found
 */
router.delete('/users/:id', protect, isAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Make sure it's a valid object ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid user ID format'
      });
    }
    
    // Fetch the user to delete
    const user = await userModel.findById(id);
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }
    
    // Managers can only delete staff members
    if (req.user.role === 'manager' && user.role !== 'staff') {
      return res.status(403).json({
        message: 'Managers can only delete staff members'
      });
    }
    
    // Delete the user
    await userModel.findByIdAndDelete(id);
    
    logger.info(`Staff member ${id} deleted by ${req.user.role} ${req.user.email}`);
    
    return res.status(200).json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting staff: ${error.message}`);
    return res.status(500).json({
      message: 'Failed to delete staff member',
      error: error.message
    });
  }
});

export default router;
