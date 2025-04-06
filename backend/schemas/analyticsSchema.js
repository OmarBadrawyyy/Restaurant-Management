import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Analytics:
 *       type: object
 *       required:
 *         - reportType
 *         - period
 *         - data
 *       properties:
 *         reportType:
 *           type: string
 *           enum: [sales, orders, customers, items, revenue]
 *           description: Type of analytics report
 *         period:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, custom]
 *           description: Time period of the report
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Start date of the report period
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: End date of the report period
 *         data:
 *           type: array
 *           items:
 *             type: object
 *           description: Report data points
 *         summary:
 *           type: object
 *           description: Summary of the report data
 */
const analyticsSchema = new mongoose.Schema({
  reportType: {
    type: String,
    required: true,
    enum: ['sales', 'orders', 'customers', 'items', 'revenue'],
    index: true
  },
  period: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    index: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  data: [{
    type: mongoose.Schema.Types.Mixed,
    required: true
  }],
  summary: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for searching by report type and date range
analyticsSchema.index({ reportType: 1, startDate: 1, endDate: 1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);

export { Analytics as analyticsModel }; 