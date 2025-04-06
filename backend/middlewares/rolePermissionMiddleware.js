import { userModel } from '../schemas/userSchema.js';
import logger from '../config/logger.js';

/**
 * Permission definitions for different user roles
 * This defines what actions each role can perform
 */
const rolePermissions = {
  customer: [
    'view_menu',
    'place_order',
    'view_own_orders',
    'track_own_orders',
    'cancel_own_orders',
    'provide_feedback',
    'make_reservation',
    'view_own_reservations',
    'cancel_own_reservations',
    'view_promotions',
    'use_promotions',
    'update_profile'
  ],
  staff: [
    // All customer permissions
    'view_menu',
    'place_order',
    'view_own_orders',
    'track_own_orders',
    'cancel_own_orders',
    'provide_feedback',
    'make_reservation',
    'view_own_reservations',
    'cancel_own_reservations',
    'view_promotions',
    'use_promotions',
    'update_profile',
    // Staff-specific permissions
    'view_all_orders',
    'update_order_status',
    'view_all_reservations',
    'update_reservation_status',
    'view_tables',
    'assign_tables',
    'view_inventory',
    'update_inventory'
  ],
  manager: [
    // All staff permissions
    'view_menu',
    'place_order',
    'view_own_orders',
    'track_own_orders',
    'cancel_own_orders',
    'provide_feedback',
    'make_reservation',
    'view_own_reservations',
    'cancel_own_reservations',
    'view_promotions',
    'use_promotions',
    'update_profile',
    'view_all_orders',
    'update_order_status',
    'view_all_reservations',
    'update_reservation_status',
    'view_tables',
    'assign_tables',
    'view_inventory',
    'update_inventory',
    // Manager-specific permissions
    'manage_menu',
    'manage_promotions',
    'view_analytics',
    'manage_inventory',
    'manage_staff',
    'respond_to_feedback',
    'view_financial_reports'
  ],
  admin: [
    // All permissions
    'view_menu',
    'place_order',
    'view_own_orders',
    'track_own_orders',
    'cancel_own_orders',
    'provide_feedback',
    'make_reservation',
    'view_own_reservations',
    'cancel_own_reservations',
    'view_promotions',
    'use_promotions',
    'update_profile',
    'view_all_orders',
    'update_order_status',
    'view_all_reservations',
    'update_reservation_status',
    'view_tables',
    'assign_tables',
    'view_inventory',
    'update_inventory',
    'manage_menu',
    'manage_promotions',
    'view_analytics',
    'manage_inventory',
    'manage_staff',
    'respond_to_feedback',
    'view_financial_reports',
    // Admin-specific permissions
    'manage_users',
    'manage_roles',
    'system_configuration',
    'view_logs',
    'manage_api_keys',
    'backup_restore'
  ]
};

/**
 * Check if a user has specific permissions
 * @param {Array} requiredPermissions - Array of permissions required for the action
 * @returns {Function} - Express middleware
 */
export const hasPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required before checking permissions.'
        });
      }

      const userRole = req.user.role;
      
      // Get permissions for the user's role
      const userPermissions = rolePermissions[userRole] || [];
      
      // Check if user has custom permissions in their profile
      if (req.user.permissions && Array.isArray(req.user.permissions)) {
        userPermissions.push(...req.user.permissions);
      }
      
      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        logger.warn(`Permission denied: User ${req.user.email} with role ${userRole} attempted to perform action requiring permissions: ${requiredPermissions.join(', ')}`);
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to perform this action.'
        });
      }
      
      next();
    } catch (error) {
      logger.error(`Permission middleware error: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Permission check failed. Please try again.'
      });
    }
  };
};

/**
 * Check if a user is the owner of a resource or has admin/manager privileges
 * @param {Function} getResourceUserId - Function to extract the user ID from the resource
 * @returns {Function} - Express middleware
 */
export const isResourceOwnerOrAdmin = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required.'
        });
      }
      
      // Admin and managers can access any resource
      if (['admin', 'manager'].includes(req.user.role)) {
        return next();
      }
      
      // Get the user ID associated with the resource
      const resourceUserId = await getResourceUserId(req);
      
      // If no user ID could be extracted, deny access
      if (!resourceUserId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. Resource not found or you do not have permission.'
        });
      }
      
      // Check if the authenticated user is the owner of the resource
      if (resourceUserId.toString() !== req.user._id.toString()) {
        logger.warn(`Resource access denied: User ${req.user.email} attempted to access resource owned by ${resourceUserId}`);
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only access your own resources.'
        });
      }
      
      next();
    } catch (error) {
      logger.error(`Resource ownership check error: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Permission check failed. Please try again.'
      });
    }
  };
};

/**
 * Get all permissions for a specific role
 * @param {String} role - User role
 * @returns {Array} - Array of permissions
 */
export const getPermissionsForRole = (role) => {
  return rolePermissions[role] || [];
};

/**
 * Check if a role has a specific permission
 * @param {String} role - User role
 * @param {String} permission - Permission to check
 * @returns {Boolean} - Whether the role has the permission
 */
export const roleHasPermission = (role, permission) => {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission);
};

/**
 * Middleware to restrict access based on user roles
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware
 */
export const rolePermissionMiddleware = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required before checking roles.'
        });
      }

      const userRole = req.user.role;
      
      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(userRole)) {
        logger.warn(`Role-based access denied: User ${req.user.email} with role ${userRole} attempted to access route restricted to ${allowedRoles.join(', ')}`);
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You do not have the required role to perform this action.'
        });
      }
      
      next();
    } catch (error) {
      logger.error(`Role permission check error: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Permission check failed. Please try again.'
      });
    }
  };
}; 