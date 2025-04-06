import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { userModel } from '../schemas/userSchema.js';
import { orderModel } from '../schemas/orderSchema.js';
import logger from './logger.js';

let io;

// Track connection attempts per IP for rate limiting
const connectionAttempts = {};

/**
 * Initialize WebSocket server
 * @param {Object} server - HTTP server instance
 */
export const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io'
  });

  // Connection rate limiting middleware
  io.use((socket, next) => {
    const clientIp = socket.handshake.address;
    
    // Initialize or increment connection count
    connectionAttempts[clientIp] = (connectionAttempts[clientIp] || 0) + 1;
    
    // Rate limit: max 10 connections per minute
    if (connectionAttempts[clientIp] > 10) {
      logger.warn(`Connection rate limit exceeded for IP: ${clientIp}`);
      return next(new Error('Rate limit exceeded'));
    }
    
    // Reset count after 1 minute
    setTimeout(() => {
      if (connectionAttempts[clientIp] > 0) {
        connectionAttempts[clientIp]--;
      }
    }, 60000);
    
    next();
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                    socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Add explicit expiration check
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        logger.warn(`WebSocket authentication error: Token expired`);
        return next(new Error('Authentication error: Token expired'));
      }
      
      // Get user from database
      const user = await userModel.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      logger.error(`WebSocket authentication error: ${error.message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection event
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user._id}`);

    // Join user-specific room
    socket.join(`user:${socket.user._id}`);

    // Join role-specific room
    if (socket.user.role) {
      socket.join(`role:${socket.user.role}`);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user._id}`);
    });

    // Handle joining order room
    socket.on('join:order', async (orderId) => {
      if (!orderId) return;
      
      try {
        // For staff/admin, allow joining any order
        if (['admin', 'manager', 'staff'].includes(socket.user.role)) {
          socket.join(`order:${orderId}`);
          logger.info(`Staff ${socket.user._id} joined order room: ${orderId}`);
          return;
        }
        
        // For customers, verify ownership
        const order = await orderModel.findById(orderId);
        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }
        
        if (order.user.toString() !== socket.user._id.toString()) {
          socket.emit('error', { message: 'Not authorized to join this order room' });
          return;
        }
        
        socket.join(`order:${orderId}`);
        logger.info(`User ${socket.user._id} joined order room: ${orderId}`);
      } catch (error) {
        logger.error(`Error joining order room: ${error.message}`);
        socket.emit('error', { message: 'Failed to join order room' });
      }
    });

    // Handle joining table room (for reservations)
    socket.on('join:table', (tableId) => {
      if (!tableId) return;
      
      // Only staff can join table rooms
      if (['admin', 'manager', 'staff'].includes(socket.user.role)) {
        socket.join(`table:${tableId}`);
        logger.info(`Staff ${socket.user._id} joined table room: ${tableId}`);
      } else {
        socket.emit('error', { message: 'Not authorized to join table room' });
      }
    });
    
    // Track message counts per user for rate limiting
    const messageCounts = {};
    
    // Add rate limiting for messages
    socket.use((packet, next) => {
      const userId = socket.user._id.toString();
      
      // Initialize or increment message count
      messageCounts[userId] = (messageCounts[userId] || 0) + 1;
      
      // Rate limit: max 50 messages per minute
      if (messageCounts[userId] > 50) {
        logger.warn(`Rate limit exceeded for user: ${userId}`);
        return next(new Error('Rate limit exceeded'));
      }
      
      // Reset count after 1 minute
      setTimeout(() => {
        if (messageCounts[userId] > 0) {
          messageCounts[userId]--;
        }
      }, 60000);
      
      next();
    });
  });

  logger.info('WebSocket server initialized');
  return io;
};

/**
 * Get the Socket.IO instance
 * @returns {Object} Socket.IO instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Send a notification to a specific user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 */
export const sendUserNotification = (userId, notification) => {
  if (!io) return;
  
  io.to(`user:${userId}`).emit('notification', notification);
  logger.info(`Notification sent to user: ${userId}`);
};

/**
 * Send an order update to all relevant parties
 * @param {string} orderId - Order ID
 * @param {Object} update - Order update data
 */
export const sendOrderUpdate = (orderId, update) => {
  if (!io) return;
  
  io.to(`order:${orderId}`).emit('order:update', {
    orderId,
    ...update
  });
  logger.info(`Order update sent for order: ${orderId}`);
};

/**
 * Send a table status update
 * @param {string} tableId - Table ID
 * @param {Object} status - Table status data
 */
export const sendTableUpdate = (tableId, status) => {
  if (!io) return;
  
  io.to(`table:${tableId}`).emit('table:update', {
    tableId,
    ...status
  });
  logger.info(`Table update sent for table: ${tableId}`);
};

/**
 * Send a message to all staff members
 * @param {string} role - Staff role (admin, manager, staff)
 * @param {string} type - Message type
 * @param {Object} data - Message data
 */
export const sendStaffMessage = (role, type, data) => {
  if (!io) return;
  
  io.to(`role:${role}`).emit(type, data);
  logger.info(`Message sent to role: ${role}`);
};

/**
 * Broadcast a message to all connected clients
 * @param {string} type - Message type
 * @param {Object} data - Message data
 */
export const broadcastMessage = (type, data) => {
  if (!io) return;
  
  io.emit(type, data);
  logger.info(`Broadcast message sent: ${type}`);
};

export default {
  initializeWebSocket,
  getIO,
  sendUserNotification,
  sendOrderUpdate,
  sendTableUpdate,
  sendStaffMessage,
  broadcastMessage
}; 