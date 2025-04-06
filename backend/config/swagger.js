import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json manually
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')
);
const { version } = packageJson;

// Swagger definition
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurant Management System API',
      version: '1.0.0',
      description: 'API documentation for the Restaurant Management System',
      contact: {
        name: 'API Support',
        email: 'support@restaurant.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'staff', 'manager', 'admin'] },
            phone: { type: 'string' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  quantity: { type: 'number' },
                  price: { type: 'number' }
                }
              }
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']
            },
            totalPrice: { type: 'number' },
            paymentStatus: { type: 'string', enum: ['pending', 'completed', 'failed'] }
          }
        },
        MenuItem: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            category: { type: 'string' },
            image: { type: 'string' },
            vegetarian: { type: 'boolean' },
            featured: { type: 'boolean' }
          }
        },
        Booking: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            guests: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] }
          }
        },
        Feedback: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            order: { type: 'string' },
            rating: { type: 'number', minimum: 1, maximum: 5 },
            comment: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Configure Swagger middleware for Express
 * @param {Object} app - Express application
 */
const setupSwagger = (app) => {
  // Serve swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('Swagger documentation available at /api-docs');
};

// Export swaggerSpec for direct import
export { swaggerSpec };

// Export setupSwagger as default for general use
export default setupSwagger; 