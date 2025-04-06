import express from 'express';
import { protect, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [sales, inventory, employee, customer, financial]
 *         description: Filter by report type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by reports generated after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by reports generated before this date
 *     responses:
 *       200:
 *         description: List of reports
 *       401:
 *         description: Unauthorized
 */
router.get('/', protect, isAdmin, async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    
    // Mock response with some filtering logic
    let mockReports = [
      {
        id: '1',
        reportType: 'sales',
        title: 'Monthly Sales Report - June 2023',
        description: 'Detailed breakdown of all sales transactions for the month of June 2023',
        generatedBy: 'Admin User',
        createdAt: new Date('2023-07-01T10:00:00Z'),
        format: 'pdf',
        status: 'completed'
      },
      {
        id: '2',
        reportType: 'inventory',
        title: 'Inventory Status Report - July 2023',
        description: 'Current inventory levels and usage statistics',
        generatedBy: 'Admin User',
        createdAt: new Date('2023-08-01T09:30:00Z'),
        format: 'pdf',
        status: 'completed'
      },
      {
        id: '3',
        reportType: 'employee',
        title: 'Staff Performance Report - Q2 2023',
        description: 'Performance metrics for all staff members in Q2 2023',
        generatedBy: 'Admin User',
        createdAt: new Date('2023-07-10T14:15:00Z'),
        format: 'pdf',
        status: 'completed'
      },
      {
        id: '4',
        reportType: 'customer',
        title: 'Customer Analysis Report - First Half 2023',
        description: 'Detailed analysis of customer behavior and demographics',
        generatedBy: 'Admin User',
        createdAt: new Date('2023-07-15T11:45:00Z'),
        format: 'pdf',
        status: 'completed'
      },
      {
        id: '5',
        reportType: 'financial',
        title: 'Profit and Loss Statement - Q1 2023',
        description: 'Comprehensive P&L statement for Q1 2023',
        generatedBy: 'Admin User',
        createdAt: new Date('2023-04-05T16:20:00Z'),
        format: 'pdf',
        status: 'completed'
      }
    ];
    
    // Apply filters if provided
    if (reportType) {
      mockReports = mockReports.filter(report => report.reportType === reportType);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      mockReports = mockReports.filter(report => new Date(report.createdAt) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      mockReports = mockReports.filter(report => new Date(report.createdAt) <= end);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        reports: mockReports
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get a single report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report details
 *       404:
 *         description: Report not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock response for a sales report
    if (id === '1') {
      res.status(200).json({
        status: 'success',
        data: {
          report: {
            id: '1',
            reportType: 'sales',
            title: 'Monthly Sales Report - June 2023',
            description: 'Detailed breakdown of all sales transactions for the month of June 2023',
            generatedBy: {
              id: '60d21b4667d0d8992e610c85',
              name: 'Admin User'
            },
            parameters: {
              groupBy: 'day',
              includeGraphs: true,
              includeTaxes: true
            },
            fileUrl: '/reports/sales/monthly-sales-june-2023.pdf',
            data: {
              totalRevenue: 87532.45,
              totalOrders: 1245,
              avgOrderValue: 70.31,
              topSellingItems: [
                { name: 'Margherita Pizza', quantity: 312, revenue: 4368.00 },
                { name: 'Classic Burger', quantity: 287, revenue: 4305.00 },
                { name: 'Caesar Salad', quantity: 198, revenue: 1980.00 }
              ],
              salesByCategory: {
                mains: 42587.00,
                appetizers: 15487.25,
                desserts: 8974.50,
                beverages: 20483.70
              }
            },
            dateRange: {
              startDate: new Date('2023-06-01T00:00:00Z'),
              endDate: new Date('2023-06-30T23:59:59Z')
            },
            createdAt: new Date('2023-07-01T10:00:00Z'),
            status: 'completed',
            format: 'pdf'
          }
        }
      });
    } else {
      // Inventory report example
      res.status(200).json({
        status: 'success',
        data: {
          report: {
            id: id,
            reportType: 'inventory',
            title: 'Inventory Status Report - July 2023',
            description: 'Current inventory levels and usage statistics',
            generatedBy: {
              id: '60d21b4667d0d8992e610c85',
              name: 'Admin User'
            },
            parameters: {
              includeExpired: false,
              showLowStock: true
            },
            fileUrl: '/reports/inventory/inventory-status-july-2023.pdf',
            data: {
              totalItems: 248,
              lowStockItems: 18,
              expiringItems: 7,
              totalValue: 15832.45,
              categoryBreakdown: {
                produce: 3241.23,
                meat: 5687.45,
                dairy: 2103.87,
                dry: 4800.90
              }
            },
            dateRange: {
              startDate: new Date('2023-07-01T00:00:00Z'),
              endDate: new Date('2023-07-31T23:59:59Z')
            },
            createdAt: new Date('2023-08-01T09:30:00Z'),
            status: 'completed',
            format: 'pdf'
          }
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Generate a new report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportType
 *               - title
 *             properties:
 *               reportType:
 *                 type: string
 *                 enum: [sales, inventory, employee, customer, financial]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               parameters:
 *                 type: object
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *               format:
 *                 type: string
 *                 enum: [pdf, csv, excel, json, html]
 *                 default: pdf
 *     responses:
 *       201:
 *         description: Report generation started
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 */
router.post('/', protect, isAdmin, async (req, res) => {
  try {
    const { reportType, title, description, parameters, dateRange, format = 'pdf' } = req.body;
    
    // Validate required fields
    if (!reportType || !title) {
      return res.status(400).json({
        status: 'error',
        message: 'Report type and title are required'
      });
    }
    
    // Mock response for report generation
    res.status(201).json({
      status: 'success',
      message: 'Report generation started',
      data: {
        report: {
          id: '6',
          reportType,
          title,
          description,
          generatedBy: {
            id: req.user.id || '60d21b4667d0d8992e610c85',
            name: req.user.name || 'Admin User'
          },
          parameters,
          dateRange,
          createdAt: new Date(),
          status: 'pending',
          format
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/reports/{id}/download:
 *   get:
 *     summary: Download a report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Report not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/download', protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock response - in a real implementation, this would send the file
    res.status(200).json({
      status: 'success',
      message: 'In a real implementation, this would return the report file',
      data: {
        fileUrl: `/reports/report-${id}.pdf`
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/reports/schedules:
 *   get:
 *     summary: Get all report schedules
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of report schedules
 *       401:
 *         description: Unauthorized
 */
router.get('/schedules', protect, isAdmin, async (req, res) => {
  try {
    // Mock response
    res.status(200).json({
      status: 'success',
      data: {
        schedules: [
          {
            id: '1',
            reportType: 'sales',
            name: 'Weekly Sales Summary',
            description: 'Automatically generated weekly sales report',
            schedule: {
              frequency: 'weekly',
              dayOfWeek: 1,
              hour: 7,
              minute: 30
            },
            isActive: true,
            nextRunAt: new Date(new Date().setDate(new Date().getDate() + ((1 + 7 - new Date().getDay()) % 7)))
          },
          {
            id: '2',
            reportType: 'inventory',
            name: 'Daily Inventory Status',
            description: 'Daily report of inventory levels and low stock items',
            schedule: {
              frequency: 'daily',
              hour: 6,
              minute: 0
            },
            isActive: true,
            nextRunAt: new Date(new Date().setDate(new Date().getDate() + 1))
          },
          {
            id: '3',
            reportType: 'financial',
            name: 'Monthly Profit & Loss',
            description: 'Comprehensive monthly P&L statement',
            schedule: {
              frequency: 'monthly',
              dayOfMonth: 5,
              hour: 8,
              minute: 0
            },
            isActive: true,
            nextRunAt: (() => {
              const date = new Date();
              date.setMonth(date.getMonth() + (date.getDate() >= 5 ? 1 : 0));
              date.setDate(5);
              return date;
            })()
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/reports/schedules:
 *   post:
 *     summary: Create a new report schedule
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportType
 *               - name
 *               - schedule
 *             properties:
 *               reportType:
 *                 type: string
 *                 enum: [sales, inventory, employee, customer, financial]
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               schedule:
 *                 type: object
 *                 required:
 *                   - frequency
 *                 properties:
 *                   frequency:
 *                     type: string
 *                     enum: [daily, weekly, monthly, quarterly, yearly]
 *                   dayOfWeek:
 *                     type: number
 *                   dayOfMonth:
 *                     type: number
 *                   hour:
 *                     type: number
 *                   minute:
 *                     type: number
 *               parameters:
 *                 type: object
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *               format:
 *                 type: string
 *                 enum: [pdf, csv, excel, json, html]
 *                 default: pdf
 *     responses:
 *       201:
 *         description: Report schedule created
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 */
router.post('/schedules', protect, isAdmin, async (req, res) => {
  try {
    const { reportType, name, description, schedule, parameters, recipients, format = 'pdf' } = req.body;
    
    // Validate required fields
    if (!reportType || !name || !schedule || !schedule.frequency) {
      return res.status(400).json({
        status: 'error',
        message: 'Report type, name, and schedule with frequency are required'
      });
    }
    
    // Mock response for schedule creation
    res.status(201).json({
      status: 'success',
      message: 'Report schedule created',
      data: {
        schedule: {
          id: '4',
          reportType,
          name,
          description,
          owner: {
            id: req.user.id || '60d21b4667d0d8992e610c85',
            name: req.user.name || 'Admin User'
          },
          schedule,
          parameters,
          recipients,
          isActive: true,
          format,
          createdAt: new Date(),
          nextRunAt: new Date(new Date().setDate(new Date().getDate() + 1)) // Just a placeholder
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router; 