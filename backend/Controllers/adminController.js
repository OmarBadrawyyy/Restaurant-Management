import { userModel } from '../schemas/userSchema.js';
import logger from '../config/logger.js';

/**
 * Get all users with pagination
 * @route GET /api/v1/admin
 */
export const getAllUsers = async (req, res) => {
  try {
    console.log('Admin getAllUsers called');
    console.log('Query params:', req.query);
    console.log('Request user:', req.user?._id?.toString(), req.user?.email);
    
    // Validate that the requesting user has a valid ObjectId
    if (!req.user || !req.user._id) {
      logger.error('Invalid user in request when fetching all users');
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Please log in again.'
      });
    }
    
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalUsers = await userModel.countDocuments();
    console.log('Total users in database:', totalUsers);
    
    // Get users with pagination
    const users = await userModel.find()
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log(`Retrieved ${users.length} users from MongoDB`);
    
    // Transform MongoDB documents to match frontend expected format
    const transformedUsers = users.map(user => ({
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      lastLogin: user.lastLogin?.toISOString() || null
    }));
    
    logger.info(`Admin fetched all users: ${req.user?.email || 'Unknown user'}`);
    console.log('Response data prepared:', { count: transformedUsers.length });
    
    // Format the response to match what frontend expects
    res.status(200).json({
      status: 'success',
      results: transformedUsers.length,
      pagination: {
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        limit
      },
      users: transformedUsers
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    logger.error(`Error fetching users: ${error.message}`);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch users' 
    });
  }
};

/**
 * Create a new admin user
 * @route POST /api/v1/admin
 */
export const createAdmin = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await userModel.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      logger.warn(`Admin creation failed: ${field} already exists - ${req.originalUrl}`);
      return res.status(409).json({ 
        status: 'error',
        message: `User with this ${field} already exists` 
      });
    }

    // Create new admin user
    const newAdmin = new userModel({
      username,
      email,
      password, // Will be hashed by the pre-save hook
      fullName,
      role: 'admin'
    });

    await newAdmin.save();

    logger.info(`Admin created successfully: ${email} by ${req.user.email}`);
    
    res.status(201).json({
      status: 'success',
      message: 'Admin created successfully',
      user: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        fullName: newAdmin.fullName,
        role: newAdmin.role
      }
    });
  } catch (error) {
    logger.error(`Admin creation error: ${error.message}`);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to create admin user' 
    });
  }
};

/**
 * Update a user
 * @route PUT /api/v1/admin/:userId
 */
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    
    // Prevent password update through this endpoint
    if (updateData.password) {
      delete updateData.password;
    }

    // Prevent users from changing their own status
    if (updateData.status && (userId === req.user.id || userId === req.user._id.toString())) {
      logger.warn(`User update failed: User attempted to change own status - ${req.user.email}`);
      return res.status(400).json({ 
        status: 'error',
        message: 'You cannot change your own account status' 
      });
    }

    // Validate status value
    if (updateData.status && !['active', 'inactive', 'suspended'].includes(updateData.status)) {
      logger.warn(`User update failed: Invalid status value - ${updateData.status}`);
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid status value. Valid values are: active, inactive, suspended' 
      });
    }

    // Convert status string to isActive boolean if present
    if (updateData.status) {
      updateData.isActive = updateData.status === 'active';
      delete updateData.status;
    }

    // Find and update the user
    try {
      const updatedUser = await userModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password -__v');

      if (!updatedUser) {
        logger.warn(`User update failed: User not found - ID: ${userId}`);
        return res.status(404).json({ 
          status: 'error',
          message: 'User not found' 
        });
      }

      // Transform user object for frontend
      const transformedUser = {
        id: updatedUser._id.toString(),
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.isActive ? 'active' : 'inactive',
        createdAt: updatedUser.createdAt?.toISOString() || new Date().toISOString(),
        lastLogin: updatedUser.lastLogin?.toISOString() || null
      };

      logger.info(`User updated successfully: ${updatedUser.email} by admin ${req.user.email}`);
      
      res.status(200).json({
        status: 'success',
        message: 'User updated successfully',
        user: transformedUser
      });
    } catch (err) {
      if (err.name === 'CastError') {
        logger.warn(`User update failed: Invalid user ID format - ${userId}`);
        return res.status(400).json({
          status: 'error',
          message: 'Invalid user ID format'
        });
      }
      throw err;
    }
  } catch (error) {
    logger.error(`User update error: ${error.message}`);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to update user' 
    });
  }
};

/**
 * Delete a user
 * @route DELETE /api/v1/admin/:userId
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id || userId === req.user._id.toString()) {
      logger.warn(`User deletion failed: Admin attempted to delete own account - ${req.user.email}`);
      return res.status(400).json({ 
        status: 'error',
        message: 'You cannot delete your own account' 
      });
    }

    // Find the user to get their email for logging
    const user = await userModel.findById(userId);
    
    if (!user) {
      logger.warn(`User deletion failed: User not found - ID: ${userId}`);
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    // Check if the user is an admin and it's the last admin
    if (user.role === 'admin') {
      const adminCount = await userModel.countDocuments({ role: 'admin' });
      
      if (adminCount <= 1) {
        logger.warn('User deletion failed: Attempted to delete the last admin user');
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete the last admin user'
        });
      }
    }
    
    // Store email for logging
    const userEmail = user.email;
    
    // Hard delete the user from database
    await user.deleteOne();

    logger.info(`User deleted successfully: ${userEmail} by admin ${req.user.email}`);
    
    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      logger.warn(`User deletion failed: Invalid user ID format - ${userId}`);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    logger.error(`User deletion error: ${error.message}`);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to delete user' 
    });
  }
};

/**
 * Get dashboard statistics for admin
 * @route GET /api/admin/dashboard
 * @access Private/Admin
 */
export const getDashboardStats = async (req, res) => {
  try {
    console.log('Getting dashboard stats');
    
    // Get actual data from database
    const totalCustomers = await userModel.countDocuments({ role: 'customer' });
    const newCustomers = await userModel.countDocuments({ 
      role: 'customer',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });
    
    // Placeholder stats until we implement real-time order data
    // In a real application, you would query from your Order and Product collections
    const stats = {
      orders: {
        total: 0,
        pending: 0,
        completed: 0,
        cancelled: 0
      },
      revenue: {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0
      },
      customers: {
        total: totalCustomers,
        new: newCustomers
      },
      inventory: {
        lowStock: 0,
        outOfStock: 0
      }
    };

    logger.info(`Admin dashboard stats fetched by: ${req.user.email}`);
    res.status(200).json({ stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    logger.error(`Dashboard stats error: ${error.message}`);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch dashboard statistics' 
    });
  }
};
