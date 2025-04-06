import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     ReportSchedule:
 *       type: object
 *       required:
 *         - reportType
 *         - name
 *         - owner
 *         - schedule
 *       properties:
 *         reportType:
 *           type: string
 *           enum: [sales, inventory, employee, customer, financial]
 *           description: Type of report to generate
 *         name:
 *           type: string
 *           description: Name of the scheduled report
 *         description:
 *           type: string
 *           description: Description of the scheduled report
 *         owner:
 *           type: string
 *           description: ID of the user who created the schedule
 *         schedule:
 *           type: object
 *           properties:
 *             frequency:
 *               type: string
 *               enum: [daily, weekly, monthly, quarterly, yearly]
 *             dayOfWeek:
 *               type: number
 *               description: Day of the week (0-6, 0 is Sunday)
 *             dayOfMonth:
 *               type: number
 *               description: Day of the month (1-31)
 *             hour:
 *               type: number
 *               description: Hour of the day (0-23)
 *             minute:
 *               type: number
 *               description: Minute of the hour (0-59)
 *           description: Schedule configuration
 *         parameters:
 *           type: object
 *           description: Parameters for the report generation
 *         recipients:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *           description: List of recipients to receive the report
 *         isActive:
 *           type: boolean
 *           description: Whether the schedule is active
 *         lastRunAt:
 *           type: string
 *           format: date-time
 *           description: When the schedule was last run
 *         nextRunAt:
 *           type: string
 *           format: date-time
 *           description: When the schedule will run next
 */
const reportScheduleSchema = new mongoose.Schema({
  reportType: {
    type: String,
    required: true,
    enum: ['sales', 'inventory', 'employee', 'customer', 'financial'],
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  schedule: {
    frequency: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    },
    hour: {
      type: Number,
      min: 0,
      max: 23,
      default: 0
    },
    minute: {
      type: Number,
      min: 0,
      max: 59,
      default: 0
    }
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed
  },
  recipients: [{
    email: {
      type: String,
      required: true
    },
    name: String
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  format: {
    type: String,
    enum: ['pdf', 'csv', 'excel', 'json', 'html'],
    default: 'pdf'
  },
  lastRunAt: {
    type: Date
  },
  nextRunAt: {
    type: Date,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

reportScheduleSchema.index({ 'schedule.frequency': 1, nextRunAt: 1 });

const reportScheduleModel = mongoose.model('ReportSchedule', reportScheduleSchema);

export { reportScheduleModel }; 