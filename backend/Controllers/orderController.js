// backend/controllers/orderController.js

import mongoose from 'mongoose';
import { orderModel } from '../schemas/orderSchema.js';
import logger from '../config/logger.js';

// Get orders with status counts for dashboard
export const getOrderStatusCounts = async (req, res) => {
  try {
    const statusCounts = await orderModel.aggregate([
      { $match: { status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Format the counts as needed by frontend
    const counts = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0
    };
    
    statusCounts.forEach(item => {
      counts[item._id] = item.count;
    });

    return res.status(200).json({
      success: true,
      data: counts
    });
  } catch (error) {
    logger.error('Error fetching order status counts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order counts',
      error: error.message
    });
  }
};

// Enhanced getAllOrders function with robust error handling
export const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate,
      search = '' 
    } = req.query;

    const query = {};
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateObj;
      }
    }

    // Search by order number, customer name, or phone
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const totalCount = await orderModel.countDocuments(query);
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    const orders = await orderModel.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitInt);
    
    return res.status(200).json({
      orders: orders.map(order => transformOrderResponse(order)),
      totalCount,
      page: pageInt,
      totalPages: Math.ceil(totalCount / limitInt)
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Add a retry handler for the "Retry" button in the UI
export const retryFetchOrders = async (req, res) => {
  try {
    // Clear any potential caches
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Call getAllOrders with the original request and response
    return await getAllOrders(req, res);
  } catch (error) {
    logger.error('Error retrying order fetch:', error);
    return res.status(500).json({
      success: false,
      message: 'Retry failed',
      error: error.message
    });
  }
};

// Transform order for frontend
function transformOrderResponse(order) {
  const orderObj = order.toObject ? order.toObject() : order;
  
  return {
    id: orderObj._id.toString(),
    orderNumber: orderObj.orderNumber || `ORD-${orderObj._id.toString().slice(-6)}`,
    date: orderObj.createdAt,
    customer: orderObj.user?.name || 'Guest',
    type: orderObj.deliveryType || 'pickup',
    total: orderObj.totalPrice || 0,
    status: orderObj.status,
    items: orderObj.items?.length || 0
  };
}

/**
 * Get order by ID
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ID validation is handled by validateObjectIds middleware
    
    const order = await orderModel.findById(id)
      .populate('user', 'name email phone')
      .populate('items.item', 'name price image');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check user permissions - admin can access any order, users can only access their own
    const userId = req.user?._id?.toString();
    const orderUserId = order.user?._id?.toString();
    
    if (!req.user?.isAdmin && userId && orderUserId && userId !== orderUserId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this order'
      });
    }
    
    // Transform order data before sending
    const transformedOrder = {
      id: order._id.toString(),
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        specialInstructions: item.specialInstructions
      })),
      total: order.totalPrice,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      isDelivery: order.deliveryType === 'delivery',
      deliveryAddress: order.deliveryAddress,
      tableNumber: order.tableNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
    
    return res.status(200).json(transformedOrder);
  } catch (error) {
    logger.error('Error fetching order by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status value
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // ID validation is handled by validateObjectIds middleware
    
    const order = await orderModel.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Add to status history
    const statusUpdate = {
      status,
      timestamp: new Date(),
      updatedBy: req.user._id
    };
    
    // Update the order
    order.status = status;
    order.statusHistory.push(statusUpdate);
    
    // If status is completed, add completed timestamp
    if (status === 'completed') {
      order.completedAt = new Date();
    }
    
    await order.save();
    
    // Return updated order
    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error updating order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

/**
 * Cancel order
 */
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ID validation is handled by validateObjectIds middleware
    
    const order = await orderModel.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Only allow cancellation if order is in pending or confirmed state
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in '${order.status}' status. Only pending or confirmed orders can be cancelled.`
      });
    }
    
    // Check user permissions - admin can cancel any order, users can only cancel their own
    if (!req.user.isAdmin && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this order'
      });
    }
    
    // Add to status history
    const statusUpdate = {
      status: 'cancelled',
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: 'Order cancelled by ' + (req.user.isAdmin ? 'admin' : 'customer')
    };
    
    // Update the order
    order.status = 'cancelled';
    order.statusHistory.push(statusUpdate);
    
    await order.save();
    
    // Return updated order
    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

/**
 * Create new order
 */
export const createOrder = async (req, res) => {
  try {
    // Extract data from request body
    const {
      items,
      deliveryType,
      deliveryAddress,
      tableNumber,
      specialInstructions,
      paymentMethod
    } = req.body;
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }
    
    // Validate delivery type and related fields
    if (!['delivery', 'dine_in', 'takeout', 'STANDARD'].includes(deliveryType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery type'
      });
    }
    
    if (deliveryType === 'delivery' && !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required for delivery orders'
      });
    }
    
    if (deliveryType === 'dine_in' && !tableNumber) {
      return res.status(400).json({
        success: false,
        message: 'Table number is required for dine-in orders'
      });
    }
    
    // Create a new order object
    const newOrder = new orderModel({
      user: req.user._id,
      items: items.map(item => ({
        item: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        specialInstructions: item.specialInstructions
      })),
      subtotal: items.reduce((total, item) => total + (item.price * item.quantity), 0),
      tax: items.reduce((total, item) => total + (item.price * item.quantity), 0) * 0.1,
      totalPrice: items.reduce((total, item) => total + (item.price * item.quantity), 0) * 1.1,
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        updatedBy: req.user._id
      }],
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'pending',
      deliveryType,
      deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : undefined,
      tableNumber: deliveryType === 'dine_in' ? tableNumber : undefined,
      specialInstructions
    });
    
    // Save the order
    await newOrder.save();
    
    // Return the created order
    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

/**
 * Delete an order (admin and manager)
 */
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ID validation is handled by validateObjectIds middleware
    
    const order = await orderModel.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Auth check is handled by isAdminOrManager middleware
    // This function is accessible to both admins and managers
    
    // Log who's deleting the order
    logger.info(`Order ${id} deleted by ${req.user.role} (${req.user.email})`);
    
    // Delete the order
    await orderModel.findByIdAndDelete(id);
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete order',
      error: error.message
    });
  }
};