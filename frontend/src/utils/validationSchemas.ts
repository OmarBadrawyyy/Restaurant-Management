import { ValidationRules, VALIDATION_RULES as RULES } from './validator';

/**
 * Auth and User validation schemas matching backend Joi schemas
 */
export const authSchemas = {
  login: {
    email: { ...RULES.email, required: true },
    password: { ...RULES.password, required: true }
  } as ValidationRules,
  
  register: {
    email: { ...RULES.email, required: true },
    password: { ...RULES.password, required: true },
    fullName: { ...RULES.name, required: false },
    username: { ...RULES.username, required: true },
    confirmPassword: { 
      required: true, 
      match: 'password',
      message: 'Passwords must match'
    },
    phone: { ...RULES.phone, required: false }
  } as ValidationRules,
  
  resetPassword: {
    password: { ...RULES.password, required: true },
    confirmPassword: { 
      required: true, 
      match: 'password',
      message: 'Passwords must match'
    }
  } as ValidationRules,
  
  forgotPassword: {
    email: { ...RULES.email, required: true }
  } as ValidationRules,
  
  updateProfile: {
    email: { ...RULES.email, required: true },
    fullName: { ...RULES.name, required: false },
    username: { ...RULES.username, required: true },
    phone: { ...RULES.phone, required: false }
  } as ValidationRules
};

/**
 * Menu validation schemas matching backend Joi schemas
 */
export const menuSchemas = {
  category: {
    name: { required: true, minLength: 2, maxLength: 50, message: 'Category name must be between 2 and 50 characters' },
    description: { required: false, maxLength: 500, message: 'Description cannot exceed 500 characters' },
    displayOrder: { required: false, min: 0, message: 'Display order must be a positive number' }
  } as ValidationRules,
  
  menuItem: {
    name: { required: true, minLength: 2, maxLength: 100, message: 'Item name must be between 2 and 100 characters' },
    description: { required: false, maxLength: 1000, message: 'Description cannot exceed 1000 characters' },
    price: { 
      required: true, 
      min: 0.01, 
      customValidator: (value: any): boolean => !isNaN(Number(value)) && Number(value) > 0,
      message: 'Price must be a positive number greater than 0'
    },
    category: { required: true, message: 'Category is required' },
    ingredients: { required: false },
    isVegetarian: { required: false },
    isVegan: { required: false },
    isGlutenFree: { required: false },
    isSpicy: { required: false },
    preparationTime: { required: false, min: 0, message: 'Preparation time must be a positive number' },
    isAvailable: { required: false }
  } as ValidationRules
};

/**
 * Order validation schemas matching backend Joi schemas
 */
export const orderSchemas = {
  createOrder: {
    items: { 
      required: true,
      customValidator: (items: any): boolean | string => {
        return Array.isArray(items) && items.length > 0 
          ? true 
          : 'Order must contain at least one item';
      }
    },
    tableNumber: { 
      required: false,
      customValidator: (value: any, formValues?: Record<string, any>): boolean | string => {
        if (formValues?.isDelivery === false && !value) {
          return 'Table number is required for dine-in orders';
        }
        return true;
      }
    },
    isDelivery: { required: true },
    deliveryAddress: {
      required: false,
      customValidator: (value: any, formValues?: Record<string, any>): boolean | string => {
        if (formValues?.isDelivery === true && !value) {
          return 'Delivery address is required for delivery orders';
        }
        return true;
      }
    },
    specialInstructions: { required: false, maxLength: 500 }
  } as ValidationRules,
  
  updateOrderStatus: {
    status: { 
      required: true,
      customValidator: (value: string): boolean | string => {
        const validStatuses = [
          'pending', 'confirmed', 'preparing', 
          'ready', 'delivered', 'completed', 'cancelled'
        ];
        return validStatuses.includes(value) 
          ? true 
          : 'Invalid order status';
      }
    }
  } as ValidationRules
};

/**
 * Inventory validation schemas matching backend Joi schemas
 */
export const inventorySchemas = {
  inventoryItem: {
    name: { required: true, minLength: 2, maxLength: 100, message: 'Item name must be between 2 and 100 characters' },
    description: { required: false, maxLength: 500 },
    category: { 
      required: true,
      customValidator: (value: string): boolean | string => {
        const validCategories = [
          'ingredient', 'supply', 'equipment', 'packaging', 'other'
        ];
        return validCategories.includes(value) 
          ? true 
          : 'Invalid inventory category';
      }
    },
    unit: { required: true, message: 'Unit of measurement is required' },
    currentStock: { 
      required: true, 
      min: 0,
      customValidator: (value: any): boolean => !isNaN(Number(value)) && Number(value) >= 0,
      message: 'Current stock must be a non-negative number'
    },
    minStockLevel: { 
      required: true, 
      min: 0,
      customValidator: (value: any): boolean => !isNaN(Number(value)) && Number(value) >= 0,
      message: 'Minimum stock level must be a non-negative number'
    },
    reorderQuantity: { required: false, min: 0 },
    cost: { 
      required: false,
      min: 0,
      customValidator: (value: any): boolean => value ? (!isNaN(Number(value)) && Number(value) >= 0) : true,
      message: 'Cost must be a non-negative number'
    },
    supplier: { required: false }
  } as ValidationRules,
  
  stockUpdate: {
    quantity: { 
      required: true,
      customValidator: (value: any): boolean | string => !isNaN(Number(value)) && Number(value) !== 0 ? true : 'Quantity must be a non-zero number',
      message: 'Quantity must be a non-zero number'
    },
    reason: { required: true, message: 'Reason for stock update is required' }
  } as ValidationRules
};

export default {
  auth: authSchemas,
  menu: menuSchemas,
  order: orderSchemas,
  inventory: inventorySchemas
}; 