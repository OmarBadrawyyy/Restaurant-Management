import { userModel } from '../schemas/userSchema.js';
import bcrypt from 'bcryptjs';
import logger from '../config/logger.js';
import mongoose from 'mongoose';

/**
 * Get user profile
 * @route GET /api/auth/profile
 * @access Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select('-password -refreshToken');
    
    if (!user) {
      logger.warn(`User profile not found: ${req.user.id}`);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    logger.info(`Profile fetched for user: ${user.email}`);
    
    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile'
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/auth/profile
 * @access Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { username, email, fullName, phone, address } = req.body;
    
    const user = await userModel.findById(req.user.id);
    
    if (!user) {
      logger.warn(`User for profile update not found: ${req.user.id}`);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if email already exists (if changing email)
    if (email && email !== user.email) {
      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        logger.warn(`Update profile failed: Email ${email} already exists`);
        return res.status(409).json({
          status: 'error',
          message: 'Email already in use'
        });
      }
    }
    
    // Check if username already exists (if changing username)
    if (username && username !== user.username) {
      const existingUser = await userModel.findOne({ username });
      if (existingUser) {
        logger.warn(`Update profile failed: Username ${username} already exists`);
        return res.status(409).json({
          status: 'error',
          message: 'Username already in use'
        });
      }
    }
    
    // Update basic info
    if (username) user.username = username;
    if (email) user.email = email;
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    
    // Handle address update
    if (address) {
      // Check if user has addresses array
      if (!user.addresses) {
        user.addresses = [];
      }
      
      const { street, city, state, zipCode, country = 'United States' } = address;
      
      // Find default address or first address
      let defaultAddress = user.addresses.find(addr => addr.isDefault);
      
      if (defaultAddress) {
        // Update existing default address
        if (street) defaultAddress.street = street;
        if (city) defaultAddress.city = city;
        if (state) defaultAddress.state = state;
        if (zipCode) defaultAddress.postalCode = zipCode;
        if (country) defaultAddress.country = country;
      } else if (user.addresses.length > 0) {
        // Update first address if no default
        const firstAddress = user.addresses[0];
        if (street) firstAddress.street = street;
        if (city) firstAddress.city = city;
        if (state) firstAddress.state = state;
        if (zipCode) firstAddress.postalCode = zipCode;
        if (country) firstAddress.country = country;
        firstAddress.isDefault = true;
      } else {
        // Create new address if none exists
        user.addresses.push({
          addressType: 'home',
          street: street || '',
          city: city || '',
          state: state || '',
          postalCode: zipCode || '',
          country: country || 'United States',
          isDefault: true
        });
      }
    }
    
    // Password update is handled separately through changePassword endpoint
    // to require current password verification
    
    const updatedUser = await user.save();
    
    logger.info(`Profile updated for user: ${updatedUser.email}`);
    
    // Format the default address for response
    let responseAddress = null;
    if (updatedUser.addresses && updatedUser.addresses.length > 0) {
      const defaultAddress = updatedUser.addresses.find(addr => addr.isDefault) || updatedUser.addresses[0];
      responseAddress = {
        street: defaultAddress.street,
        city: defaultAddress.city,
        state: defaultAddress.state,
        zipCode: defaultAddress.postalCode,
        country: defaultAddress.country
      };
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        role: updatedUser.role,
        address: responseAddress
      }
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
};

/**
 * Get all users (with filtering and pagination)
 * @route GET /api/users
 * @access Private/Admin
 */
export const getUsers = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Add search filter for name, username or email
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add role filter
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    // Add status filter
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const users = await userModel
      .find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await userModel.countDocuments(filter);
    
    logger.info(`Retrieved ${users.length} users (page ${page}/${Math.ceil(total / parseInt(limit))})`);
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: users
    });
  } catch (error) {
    logger.error(`Get users error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
};

/**
 * Get a single user by ID
 * @route GET /api/users/:id
 * @access Private/Admin
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    const user = await userModel.findById(id).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    logger.info(`Retrieved user: ${user.email}`);
    
    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    logger.error(`Get user by ID error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user'
    });
  }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    const user = await userModel.findById(id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Prevent deleting self
    if (user._id.toString() === req.user.id) {
      logger.warn(`Delete user failed: User ${user.email} attempted to delete themselves`);
      return res.status(403).json({
        status: 'error',
        message: 'You cannot delete your own account'
      });
    }
    
    // Check if the user is an admin and it's the last admin
    if (user.role === 'admin') {
      const adminCount = await userModel.countDocuments({ role: 'admin' });
      
      if (adminCount <= 1) {
        logger.warn('Delete user failed: Attempted to delete the last admin user');
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete the last admin user'
        });
      }
    }
    
    await user.deleteOne();
    
    logger.info(`User deleted: ${user.email}`);
    
    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete user error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user'
    });
  }
};

/**
 * Toggle user active status
 * @route PATCH /api/users/:id/toggle-status
 * @access Private/Admin
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    const user = await userModel.findById(id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Prevent deactivating self
    if (user._id.toString() === req.user.id) {
      logger.warn(`Status toggle failed: User ${user.email} attempted to deactivate themselves`);
      return res.status(403).json({
        status: 'error',
        message: 'You cannot change your own status'
      });
    }
    
    // Check if the user is an admin and it's the last active admin
    if (user.role === 'admin' && user.isActive) {
      const activeAdminsCount = await userModel.countDocuments({
        role: 'admin',
        isActive: true
      });
      
      if (activeAdminsCount <= 1) {
        logger.warn('Status toggle failed: Attempted to deactivate the last active admin');
        return res.status(400).json({
          status: 'error',
          message: 'Cannot deactivate the last active admin user'
        });
      }
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    logger.info(`User ${user.isActive ? 'activated' : 'deactivated'}: ${user.email}`);
    
    res.status(200).json({
      status: 'success',
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    logger.error(`Toggle status error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle user status'
    });
  }
};

/**
 * Update user role (admin only)
 * @route PATCH /api/users/:id/role
 * @access Private/Admin
 */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    // Validate role
    const validRoles = ['customer', 'staff', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Valid roles are: customer, staff, manager, admin'
      });
    }
    
    const user = await userModel.findById(id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Prevent changing own role
    if (user._id.toString() === req.user.id) {
      logger.warn(`Role update failed: User ${user.email} attempted to change their own role`);
      return res.status(403).json({
        status: 'error',
        message: 'You cannot change your own role'
      });
    }
    
    // Check if downgrading from admin and it's the last admin
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await userModel.countDocuments({ role: 'admin' });
      
      if (adminCount <= 1) {
        logger.warn('Role update failed: Attempted to downgrade the last admin');
        return res.status(400).json({
          status: 'error',
          message: 'Cannot demote the last admin user'
        });
      }
    }
    
    user.role = role;
    await user.save();
    
    logger.info(`User role updated to ${role}: ${user.email}`);
    
    res.status(200).json({
      status: 'success',
      message: 'User role updated successfully',
      data: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Update role error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user role'
    });
  }
};

/**
 * Change password
 * @route POST /api/auth/change-password
 * @access Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Both current password and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters long'
      });
    }
    
    // Find the user
    const user = await userModel.findById(req.user.id);
    if (!user) {
      logger.warn(`Change password failed: User not found: ${req.user.id}`);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isPasswordMatch = await user.comparePassword(currentPassword);
    if (!isPasswordMatch) {
      logger.warn(`Change password failed: Incorrect current password for user: ${user.email}`);
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    logger.info(`Password changed successfully for user: ${user.email}`);
    
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
}; 