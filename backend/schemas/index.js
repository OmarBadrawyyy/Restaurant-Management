// Export all schema models from a single file for easier imports

// Menu and Food Items
import { menuItemModel } from './menuItemSchema.js';
import { menuModel } from './menuSchema.js';

// Order Management
import { orderModel } from './orderSchema.js';
import { cartModel } from './cartSchema.js';
import { paymentModel } from './paymentSchema.js';

// User Management
import { userModel } from './userSchema.js';
import { feedbackModel } from './feedbackSchema.js';

// Restaurant Management
import { tableModel } from './tableSchema.js';
import { bookingModel } from './bookingSchema.js';
import { inventoryModel } from './inventorySchema.js';

// Analytics
import { analyticsModel } from './analyticsSchema.js';
import { reportModel } from './reportSchema.js';
import { reportScheduleModel } from './reportScheduleSchema.js';

export {
    // Menu and Food Items
    menuItemModel,
    menuModel,
    
    // Order Management
    orderModel,
    cartModel,
    paymentModel,
    
    // User Management
    userModel,
    feedbackModel,
    
    // Restaurant Management
    tableModel,
    bookingModel,
    inventoryModel,
    
    // Analytics
    analyticsModel,
    reportModel,
    reportScheduleModel
}; 