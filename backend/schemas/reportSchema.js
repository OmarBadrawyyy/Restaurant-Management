import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Report:
 *       type: object
 *       required:
 *         - reportType
 *         - title
 *         - generatedBy
 *       properties:
 *         reportType:
 *           type: string
 *           enum: [sales, inventory, employee, customer, financial]
 *           description: Type of report
 *         title:
 *           type: string
 *           description: Title of the report
 *         description:
 *           type: string
 *           description: Description of what the report contains
 *         generatedBy:
 *           type: string
 *           description: ID of the user who generated the report
 *         parameters:
 *           type: object
 *           description: Parameters used to generate the report
 *         fileUrl:
 *           type: string
 *           description: URL to the generated report file (if applicable)
 *         data:
 *           type: object
 *           description: Report data
 *         dateRange:
 *           type: object
 *           properties:
 *             startDate:
 *               type: string
 *               format: date-time
 *             endDate:
 *               type: string
 *               format: date-time
 *           description: Date range for the report
 */
const reportSchema = new mongoose.Schema({
  reportType: {
    type: String,
    required: true,
    enum: ['sales', 'inventory', 'employee', 'customer', 'financial'],
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed
  },
  fileUrl: {
    type: String
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  dateRange: {
    startDate: {
      type: Date,
      index: true
    },
    endDate: {
      type: Date,
      index: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReportSchedule',
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
    index: true
  },
  format: {
    type: String,
    enum: ['pdf', 'csv', 'excel', 'json', 'html'],
    default: 'pdf'
  }
}, {
  timestamps: true
});

reportSchema.index({ reportType: 1, createdAt: -1 });

const reportModel = mongoose.model('Report', reportSchema);

export { reportModel }; 