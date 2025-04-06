import Joi from 'joi';

// Auth validation schemas
export const authSchemas = {
  register: Joi.object({
    username: Joi.string().required().min(3).max(30).trim(),
    fullName: Joi.string().optional().trim(),
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().required().min(6).max(100).messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must be less than 100 characters',
      'string.empty': 'Password is required'
    }),
    role: Joi.string().valid('customer', 'staff', 'manager', 'admin').default('customer')
  }),
  
  login: Joi.object({
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required'
    })
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().optional()
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'string.empty': 'Current password is required'
    }),
    newPassword: Joi.string().required().min(6)
      .messages({
        'string.min': 'New password must be at least 6 characters long',
        'string.empty': 'New password is required'
      })
  }),
  
  forgotPassword: Joi.object({
    email: Joi.string().email().required().trim().lowercase()
  }),
  
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().required().min(6).messages({
      'string.min': 'Password must be at least 6 characters long'
    })
  })
};

// User validation schemas
export const userSchemas = {
  updateProfile: Joi.object({
    username: Joi.string().min(3).max(30).trim(),
    fullName: Joi.string().trim(),
    firstName: Joi.string().trim(),
    lastName: Joi.string().trim(),
    email: Joi.string().email().trim().lowercase()
  }).min(1),
  
  update: Joi.object({
    username: Joi.string().min(3).max(30).trim(),
    fullName: Joi.string().trim(),
    firstName: Joi.string().trim(),
    lastName: Joi.string().trim(),
    email: Joi.string().email().trim().lowercase(),
    role: Joi.string().valid('customer', 'staff', 'manager', 'admin'),
    isActive: Joi.boolean(),
    status: Joi.string().valid('active', 'inactive', 'suspended')
  }).min(1),
  
  updateRole: Joi.object({
    role: Joi.string().valid('customer', 'staff', 'manager', 'admin').required()
  }),
  
  addressSchema: Joi.object({
    addressType: Joi.string().valid('home', 'work', 'other').default('home'),
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().required(),
    isDefault: Joi.boolean().default(false)
  })
};

// Menu item validation schemas
export const menuItemSchemas = {
  create: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().min(0).required(),
    category: Joi.string().required(),
    image: Joi.string().uri().optional()
  }),
  update: Joi.object({
    name: Joi.string(),
    description: Joi.string(),
    price: Joi.number().min(0),
    category: Joi.string(),
    image: Joi.string().uri().optional()
  }).min(1)
};

// Order validation schemas
export const orderSchemas = {
  create: Joi.object({
    items: Joi.array().items(
      Joi.object({
        itemId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        name: Joi.string().required(),
        price: Joi.number().min(0).required()
      })
    ).min(1).required(),
    totalAmount: Joi.number().min(0).required(),
    status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled').default('pending')
  }),
  update: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled').required()
  })
};

// Booking validation schemas
export const bookingSchemas = {
  create: Joi.object({
    tableId: Joi.string().required(),
    date: Joi.date().iso().min('now').required(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    guestCount: Joi.number().integer().min(1).required(),
    specialRequests: Joi.string().allow('', null)
  }),
  update: Joi.object({
    date: Joi.date().iso().min('now'),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    guestCount: Joi.number().integer().min(1),
    specialRequests: Joi.string().allow('', null),
    status: Joi.string().valid('pending', 'confirmed', 'cancelled')
  }).min(1)
};

// Feedback validation schemas
export const feedbackSchemas = {
  create: Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().required(),
    orderId: Joi.string().optional()
  })
};

// Table validation schemas
export const tableSchemas = {
  create: Joi.object({
    tableNumber: Joi.number().integer().min(1).required(),
    capacity: Joi.number().integer().min(1).required(),
    status: Joi.string().valid('available', 'occupied', 'reserved').default('available')
  }),
  update: Joi.object({
    capacity: Joi.number().integer().min(1),
    status: Joi.string().valid('available', 'occupied', 'reserved')
  }).min(1)
};

// Notification validation schemas
export const notificationSchemas = {
  settings: Joi.object({
    email: Joi.boolean().required(),
    push: Joi.boolean().required(),
    orderUpdates: Joi.boolean().required(),
    promotions: Joi.boolean().required()
  }),
  markRead: Joi.object({
    notificationId: Joi.string().required()
  })
}; 