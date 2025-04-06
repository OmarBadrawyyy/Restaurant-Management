import mongoose from 'mongoose';
import { orderModel } from '../schemas/orderSchema.js';
import { menuItemModel } from '../schemas/menuItemSchema.js';
import { userModel } from '../schemas/userSchema.js';
import { bookingModel } from '../schemas/bookingSchema.js';
import { feedbackModel } from '../schemas/feedbackSchema.js';
import { inventoryModel } from '../schemas/inventorySchema.js';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Get sales analytics with optimized query performance
 * @route GET /api/analytics/sales
 */
export const getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day', page = 1, limit = 10 } = req.query;
    
    // Input validation
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid startDate format. Use YYYY-MM-DD.' 
      });
    }
    
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid endDate format. Use YYYY-MM-DD.' 
      });
    }
    
    // Validate groupBy parameter
    if (!['hour', 'day', 'week', 'month', 'year'].includes(groupBy)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid groupBy parameter. Use hour, day, week, month, or year.'
      });
    }
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.orderDate = { $gte: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.orderDate = { ...dateFilter.orderDate, $lte: new Date(`${endDate}T23:59:59.999Z`) };
    }
    
    // Create grouping based on the groupBy parameter
    let groupingStage;
    switch (groupBy) {
      case 'hour':
        groupingStage = {
          year: { $year: '$orderDate' },
          month: { $month: '$orderDate' },
          day: { $dayOfMonth: '$orderDate' },
          hour: { $hour: '$orderDate' }
        };
        break;
      case 'day':
        groupingStage = {
          year: { $year: '$orderDate' },
          month: { $month: '$orderDate' },
          day: { $dayOfMonth: '$orderDate' }
        };
        break;
      case 'week':
        groupingStage = {
          year: { $year: '$orderDate' },
          week: { $week: '$orderDate' }
        };
        break;
      case 'month':
        groupingStage = {
          year: { $year: '$orderDate' },
          month: { $month: '$orderDate' }
        };
        break;
      default: // year
        groupingStage = {
          year: { $year: '$orderDate' }
        };
    }
    
    // Aggregation pipeline
    const aggregationPipeline = [
      { $match: { ...dateFilter, status: { $in: ['completed', 'delivered'] } } },
      {
        $group: {
          _id: groupingStage,
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      },
      {
        $project: {
          _id: 0,
          period: '$_id',
          totalSales: { $round: ['$totalSales', 2] },
          orderCount: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] },
          // Create a properly formatted date for sorting
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: { $ifNull: ['$_id.month', 1] },
              day: { $ifNull: ['$_id.day', 1] },
              hour: { $ifNull: ['$_id.hour', 0] }
            }
          }
        }
      },
      { $sort: { date: -1 } }
    ];
    
    // Execute aggregation pipeline
    const data = await orderModel.aggregate(aggregationPipeline)
      .skip(skip)
      .limit(limitNum);
    
    // Count total documents for pagination
    const totalItemsPipeline = [
      { $match: { ...dateFilter, status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: groupingStage } },
      { $count: 'total' }
    ];
    
    const totalItemsResult = await orderModel.aggregate(totalItemsPipeline);
    const totalItems = totalItemsResult.length > 0 ? totalItemsResult[0].total : 0;
    
    // Get summary statistics
    const summaryPipeline = [
      { $match: { ...dateFilter, status: { $in: ['completed', 'delivered'] } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      },
      {
        $project: {
          _id: 0,
          totalSales: { $round: ['$totalSales', 2] },
          totalOrders: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] }
        }
      }
    ];
    
    const summaryResult = await orderModel.aggregate(summaryPipeline);
    const summary = summaryResult.length > 0 ? summaryResult[0] : {
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0
    };
    
    res.json({
      period: {
        start: startDate,
        end: endDate,
        groupBy
      },
      summary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum)
      },
      data
    });
  } catch (error) {
    logger.error(`Error fetching sales analytics: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Could not retrieve sales analytics',
      error: error.message
    });
  }
};

/**
 * Get menu items analytics with optimized query performance
 * @route GET /api/analytics/menu-items
 */
export const getMenuItemsAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 5 } = req.query;
    
    // Input validation
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid startDate format. Use YYYY-MM-DD.' 
      });
    }
    
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid endDate format. Use YYYY-MM-DD.' 
      });
    }
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.orderDate = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      dateFilter.orderDate = { ...dateFilter.orderDate, $lte: new Date(`${endDate}T23:59:59.999Z`) };
    }
    
    // Aggregation pipeline for popular menu items
    const popularItemsQuery = [
      // Match orders within date range and with completed status
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['completed', 'delivered'] } 
        } 
      },
      // Unwind order items to process each menu item separately
      { $unwind: '$items' },
      // Group by menu item to calculate statistics
      {
        $group: {
          _id: '$items.menuItemId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 }
        }
      },
      // Join with menu items collection to get item details
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem'
        }
      },
      // Ensure we have a menu item
      { $match: { 'menuItem.0': { $exists: true } } },
      // Reshape the output
      {
        $project: {
          _id: 1,
          name: { $arrayElemAt: ['$menuItem.name', 0] },
          category: { $arrayElemAt: ['$menuItem.category', 0] },
          totalQuantity: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          orderCount: 1,
          averagePrice: { 
            $round: [
              { $divide: ['$totalRevenue', '$totalQuantity'] }, 
              2
            ] 
          }
        }
      },
      // Sort by total quantity sold in descending order
      { $sort: { totalQuantity: -1 } },
      // Apply pagination
      { $skip: skip },
      { $limit: limitNum }
    ];
    
    // Count total documents for pagination
    const countQuery = [
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['completed', 'delivered'] } 
        } 
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId'
        }
      },
      { $count: 'total' }
    ];
    
    // Execute both queries in parallel
    const [mostPopular, countResult] = await Promise.all([
      orderModel.aggregate(popularItemsQuery),
      orderModel.aggregate(countQuery)
    ]);
    
    const totalItems = countResult.length > 0 ? countResult[0].total : 0;
    
    res.json({
      period: {
        start: startDate,
        end: endDate
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum)
      },
      mostPopular
    });
  } catch (error) {
    logger.error(`Error fetching menu items analytics: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Could not retrieve menu items analytics',
      error: error.message
    });
  }
};

/**
 * Get customer analytics
 * @route GET /api/analytics/customers
 */
export const getCustomerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Input validation
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid startDate format. Use YYYY-MM-DD.' 
      });
    }
    
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid endDate format. Use YYYY-MM-DD.' 
      });
    }
    
    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(`${endDate}T23:59:59.999Z`) };
    }
    
    // Query for total customers 
    const totalCustomers = await userModel.countDocuments({ role: 'customer' });
    
    // Query for new customers in the date range
    const newCustomers = await userModel.countDocuments({
      role: 'customer',
      ...dateFilter
    });
    
    // Query for customers with orders in the date range (active customers)
    const orderDateFilter = {};
    if (startDate) {
      orderDateFilter.orderDate = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      orderDateFilter.orderDate = { ...orderDateFilter.orderDate, $lte: new Date(`${endDate}T23:59:59.999Z`) };
    }
    
    const customerIdsWithOrders = await orderModel.distinct('userId', orderDateFilter);
    const activeCustomers = customerIdsWithOrders.length;
    
    // Calculate retention rate
    const retentionRate = totalCustomers > 0 
      ? Number(((activeCustomers / totalCustomers) * 100).toFixed(1)) 
      : 0;
    
    // Find top customers by total spent
    const topCustomersPipeline = [
      { $match: orderDateFilter },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          email: '$user.email',
          totalSpent: { $round: ['$totalSpent', 2] },
          orderCount: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 }
    ];
    
    const topCustomers = await orderModel.aggregate(topCustomersPipeline);
    
    res.json({
      period: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalCustomers,
        newCustomers,
        activeCustomers,
        retentionRate
      },
      topCustomers
    });
  } catch (error) {
    logger.error(`Error fetching customer analytics: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Could not retrieve customer analytics',
      error: error.message
    });
  }
};

/**
 * Get inventory analytics
 * @route GET /api/analytics/inventory
 */
export const getInventoryAnalytics = async (req, res) => {
  try {
    // Get current inventory data
    const inventoryItems = await inventoryModel.find({});
    
    // Calculate metrics
    const totalItems = inventoryItems.length;
    const totalValue = inventoryItems.reduce((sum, item) => 
      sum + (item.currentStock * item.costPerUnit), 0);
    
    // Identify low stock items (below minimum level)
    const lowStockItems = inventoryItems
      .filter(item => item.currentStock < item.minStockLevel)
      .map(item => ({
        _id: item._id,
        name: item.name,
        currentStock: item.currentStock,
        minStockLevel: item.minStockLevel,
        reorderPoint: item.reorderPoint,
        costPerUnit: item.costPerUnit
      }));
    
    // Identify items that need to be reordered (below reorder point)
    const reorderItems = inventoryItems
      .filter(item => item.currentStock < item.reorderPoint)
      .map(item => ({
        _id: item._id,
        name: item.name,
        currentStock: item.currentStock,
        minStockLevel: item.minStockLevel,
        reorderPoint: item.reorderPoint,
        costPerUnit: item.costPerUnit,
        suggestedOrderQuantity: Math.max(item.reorderPoint - item.currentStock, 0)
      }));
    
    // Calculate value by category
    const categoriesMap = new Map();
    
    inventoryItems.forEach(item => {
      const category = item.category || 'uncategorized';
      const value = item.currentStock * item.costPerUnit;
      
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, {
          _id: category,
          totalItems: 0,
          totalValue: 0,
          averageValue: 0
        });
      }
      
      const categoryData = categoriesMap.get(category);
      categoryData.totalItems += 1;
      categoryData.totalValue += value;
    });
    
    // Calculate averages for each category
    const valueByCategory = Array.from(categoriesMap.values()).map(category => ({
      ...category,
      totalValue: Number(category.totalValue.toFixed(2)),
      averageValue: Number((category.totalValue / category.totalItems).toFixed(2))
    }));
    
    // Format response
    res.json({
      summary: {
        totalItems,
        totalValue: Number(totalValue.toFixed(2)),
        lowStockCount: lowStockItems.length,
        reorderCount: reorderItems.length
      },
      lowStockItems,
      reorderItems,
      valueByCategory
    });
  } catch (error) {
    logger.error(`Error fetching inventory analytics: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Could not retrieve inventory analytics',
      error: error.message
    });
  }
};

/**
 * Get feedback analytics
 * @route GET /api/analytics/feedback
 */
export const getFeedbackAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Input validation
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid startDate format. Use YYYY-MM-DD.' 
      });
    }
    
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid endDate format. Use YYYY-MM-DD.' 
      });
    }
    
    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(`${endDate}T23:59:59.999Z`) };
    }
    
    // Set MongoDB options for query optimization
    const mongoOptions = { 
      maxTimeMS: 5000,      // 5 second timeout for each query
      allowDiskUse: true,   // Allow disk use for large operations
      readPreference: 'secondaryPreferred' // Read from secondary nodes if available
    };
    
    try {
      // Execute all analytics queries in parallel for better performance
      const [averageRatingResult, ratingDistributionResult, categoryRatingsResult, commonTagsResult] = await Promise.all([
        // Average rating calculation
        feedbackModel.aggregate([
          {
            $match: dateFilter
          },
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
              totalReviews: { $sum: 1 }
            }
          }
        ], mongoOptions),
        
        // Rating distribution (count of each star rating)
        feedbackModel.aggregate([
          {
            $match: dateFilter
          },
          {
            $group: {
              _id: '$rating',
              count: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: null,
              distribution: { 
                $push: { 
                  k: { $toString: '$_id' }, 
                  v: '$count' 
                } 
              },
              total: { $sum: '$count' }
            }
          },
          {
            $project: {
              _id: 0,
              distribution: { $arrayToObject: '$distribution' },
              total: 1
            }
          }
        ], mongoOptions),
        
        // Get category ratings
        feedbackModel.aggregate([
          {
            $match: {
              ...dateFilter,
              'categoryRatings.food': { $exists: true }
            }
          },
          // Optimize by limiting fields in memory
          {
            $project: {
              'categoryRatings.food': 1,
              'categoryRatings.service': 1,
              'categoryRatings.ambience': 1,
              'categoryRatings.cleanliness': 1,
              'categoryRatings.value': 1
            }
          },
          {
            $group: {
              _id: null,
              foodAvg: { $avg: '$categoryRatings.food' },
              serviceAvg: { $avg: '$categoryRatings.service' },
              ambienceAvg: { $avg: '$categoryRatings.ambience' },
              cleanlinessAvg: { $avg: '$categoryRatings.cleanliness' },
              valueAvg: { $avg: '$categoryRatings.value' }
            }
          }
        ], mongoOptions),
        
        // Get most common tags (with limit for performance)
        feedbackModel.aggregate([
          {
            $match: {
              ...dateFilter,
              tags: { $exists: true, $ne: [] }
            }
          },
          // Optimize by limiting fields in memory
          {
            $project: {
              tags: 1
            }
          },
          { $unwind: '$tags' },
          {
            $group: {
              _id: '$tags',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ], mongoOptions)
      ]);
      
      // Process results
      const avgRating = averageRatingResult.length > 0 ? averageRatingResult[0] : { averageRating: 0, totalReviews: 0 };
      
      // Process rating distribution
      const ratingDistribution = ratingDistributionResult.length > 0 ? ratingDistributionResult[0].distribution : {};
      
      // Default category ratings if no data
      const categoryRatings = categoryRatingsResult.length > 0 ? {
        food: parseFloat(categoryRatingsResult[0].foodAvg.toFixed(1)),
        service: parseFloat(categoryRatingsResult[0].serviceAvg.toFixed(1)),
        ambience: parseFloat(categoryRatingsResult[0].ambienceAvg.toFixed(1)),
        cleanliness: parseFloat(categoryRatingsResult[0].cleanlinessAvg.toFixed(1)),
        value: parseFloat(categoryRatingsResult[0].valueAvg.toFixed(1))
      } : {
        food: 0,
        service: 0,
        ambience: 0,
        cleanliness: 0,
        value: 0
      };
      
      res.json({
        period: {
          start: startDate,
          end: endDate
        },
        summary: {
          averageRating: parseFloat(avgRating.averageRating.toFixed(1)),
          totalReviews: avgRating.totalReviews,
          ratingDistribution: {
            fiveStar: parseInt(ratingDistribution['5']) || 0,
            fourStar: parseInt(ratingDistribution['4']) || 0,
            threeStar: parseInt(ratingDistribution['3']) || 0,
            twoStar: parseInt(ratingDistribution['2']) || 0,
            oneStar: parseInt(ratingDistribution['1']) || 0
          }
        },
        categoryRatings,
        commonTags: commonTagsResult
      });
    } catch (queryError) {
      // Handle specific query errors
      logger.error(`Error executing feedback analytics queries: ${queryError.message}`);
      
      // Identify and handle specific error types
      if (queryError.name === 'MongoTimeoutError' || queryError.message.includes('timed out')) {
        return res.status(504).json({ 
          status: 'error',
          message: 'The feedback analytics query timed out. Try reducing the date range.'
        });
      }
      
      // For other errors, return a generic message
      res.status(500).json({ 
        status: 'error',
        message: 'Unable to retrieve feedback analytics data. Please try again later.' 
      });
    }
  } catch (error) {
    logger.error(`Error fetching feedback analytics: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Could not retrieve feedback analytics',
      error: error.message
    });
  }
};

/**
 * Get dashboard summary analytics
 * @route GET /api/analytics/dashboard
 */
export const getDashboardAnalytics = async (req, res) => {
  try {
    // Set up date ranges
    const currentDate = new Date();
    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);
    
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    
    const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    // Set up MongoDB operation options to avoid timing out
    const mongoOptions = { 
      maxTimeMS: 5000,  // 5 second timeout for each query
      readPreference: 'secondaryPreferred' // Allow reading from secondary nodes if available
    };

    // Define simpler, faster aggregation pipelines
    const todaySalesPipeline = [
      { $match: { createdAt: { $gte: todayStart, $lt: tomorrowStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } }
    ];

    const yesterdaySalesPipeline = [
      { $match: { createdAt: { $gte: yesterdayStart, $lt: todayStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } }
    ];

    const currentMonthSalesPipeline = [
      { $match: { createdAt: { $gte: currentMonthStart, $lt: nextMonthStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } }
    ];

    const previousMonthSalesPipeline = [
      { $match: { createdAt: { $gte: previousMonthStart, $lt: currentMonthStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } }
    ];

    // Run all queries in parallel with promise.all
    try {
      const [
        todaySales,
        yesterdaySales,
        currentMonthSales,
        previousMonthSales,
        pendingOrders,
        todayReservations,
        lowStockItems,
        systemStats,
        recentFeedback
      ] = await Promise.all([
        // Sales analytics
        orderModel.aggregate(todaySalesPipeline, mongoOptions),
        orderModel.aggregate(yesterdaySalesPipeline, mongoOptions),
        orderModel.aggregate(currentMonthSalesPipeline, mongoOptions),
        orderModel.aggregate(previousMonthSalesPipeline, mongoOptions),
        
        // Operations counts
        orderModel.countDocuments({ status: 'pending' }, { maxTimeMS: 3000 }),
        bookingModel.countDocuments({ date: { $gte: todayStart, $lt: tomorrowStart } }, { maxTimeMS: 3000 }),
        inventoryModel.countDocuments({ currentStock: { $lt: 10 }, isActive: true }, { maxTimeMS: 3000 }),
        
        // System statistics - run as separate promises for better error isolation
        Promise.all([
          userModel.countDocuments({}, { maxTimeMS: 3000 }),
          userModel.countDocuments({ role: 'customer' }, { maxTimeMS: 3000 }),
          userModel.countDocuments({ role: { $in: ['admin', 'manager', 'staff'] } }, { maxTimeMS: 3000 }),
          userModel.countDocuments({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }, { maxTimeMS: 3000 })
        ]),
        
        // Recent feedback with reduced fields and limit
        feedbackModel.find({}, { rating: 1, comment: 1, createdAt: 1, userId: 1 })
          .sort({ createdAt: -1 })
          .limit(3)
          .populate({ path: 'userId', select: 'firstName lastName' })
          .lean()
          .exec()
      ]);

      // Format the results
      const formatSalesData = (salesData) => {
        if (!salesData || salesData.length === 0) return { total: 0, count: 0 };
        return salesData[0];
      };

      const todaySalesData = formatSalesData(todaySales);
      const yesterdaySalesData = formatSalesData(yesterdaySales);
      const currentMonthSalesData = formatSalesData(currentMonthSales);
      const previousMonthSalesData = formatSalesData(previousMonthSales);

      // Calculate growth rates
      const dailyGrowth = yesterdaySalesData.total === 0 
        ? (todaySalesData.total > 0 ? 100 : 0)
        : ((todaySalesData.total - yesterdaySalesData.total) / yesterdaySalesData.total) * 100;
      
      const monthlyGrowth = previousMonthSalesData.total === 0 
        ? (currentMonthSalesData.total > 0 ? 100 : 0)
        : ((currentMonthSalesData.total - previousMonthSalesData.total) / previousMonthSalesData.total) * 100;

      // System stats destructuring
      const [totalUsers, totalCustomers, totalStaff, newUsersToday] = systemStats;

      // Prepare and send the response
      return res.json({
        timestamp: new Date(),
        sales: {
          today: {
            total: todaySalesData.total || 0,
            count: todaySalesData.count || 0
          },
          yesterday: {
            total: yesterdaySalesData.total || 0,
            count: yesterdaySalesData.count || 0
          },
          currentMonth: {
            total: currentMonthSalesData.total || 0,
            count: currentMonthSalesData.count || 0
          },
          growth: {
            daily: parseFloat(dailyGrowth.toFixed(2)),
            monthly: parseFloat(monthlyGrowth.toFixed(2))
          }
        },
        operations: {
          pendingOrders,
          todayReservations,
          lowStockItems
        },
        systemStats: {
          totalUsers,
          totalCustomers,
          totalStaff,
          newUsersToday
        },
        recentFeedback
      });
    } catch (timeoutError) {
      // Handle timeout specifically for better error reporting
      logger.warn(`Analytics dashboard query timed out: ${timeoutError.message}`);
      return res.status(504).json({ 
        error: 'TIMEOUT_ERROR',
        message: 'Analytics query timed out. Please try again later.' 
      });
    }
  } catch (error) {
    // Enhanced error handling with specific error types
    logger.error(`Error generating dashboard analytics: ${error.message}`);
    
    let status = 500;
    let errorType = 'SERVER_ERROR';
    let message = 'Failed to generate dashboard analytics';
    
    // Identify specific error types
    if (error.name === 'MongoTimeoutError' || 
        (error.message && error.message.includes('timed out'))) {
      status = 504;
      errorType = 'TIMEOUT_ERROR';
      message = 'Analytics query timed out. Please try again later.';
    } else if (error.name === 'MongoServerError') {
      if (error.code === 136) {
        status = 500;
        errorType = 'CURSOR_NOT_FOUND';
        message = 'Database cursor expired. Please try again.';
      } else if (error.codeName === 'ExceededMemoryLimit') {
        status = 500;
        errorType = 'MEMORY_LIMIT_EXCEEDED';
        message = 'Query exceeded memory limit. Try refining your request.';
      }
    }
    
    res.status(status).json({ 
      error: errorType,
      message 
    });
  }
}; 