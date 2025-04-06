import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - user
 *         - items
 *         - totalPrice
 *       properties:
 *         user:
 *           type: string
 *           description: Reference to the user who placed the order
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               item:
 *                 type: string
 *                 description: Reference to the menu item
 *               quantity:
 *                 type: number
 *                 description: Quantity of the item ordered
 *               price:
 *                 type: number
 *                 description: Price of the item at the time of order
 *               customizations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     option:
 *                       type: string
 *                     price:
 *                       type: number
 *               specialInstructions:
 *                 type: string
 *                 description: Special instructions for this item
 *         subtotal:
 *           type: number
 *           description: Subtotal before tax and discounts
 *         tax:
 *           type: number
 *           description: Tax amount
 *         discount:
 *           type: number
 *           description: Discount amount
 *         totalPrice:
 *           type: number
 *           description: Total price after tax and discounts
 *         status:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready, delivered, completed, cancelled]
 *           description: Current status of the order
 *         statusHistory:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               note:
 *                 type: string
 *           description: History of status changes
 *         paymentMethod:
 *           type: string
 *           enum: [cash, credit_card, debit_card, digital_wallet, gift_card]
 *           description: Method of payment
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, refunded, failed]
 *           description: Status of payment
 *         paymentDetails:
 *           type: object
 *           properties:
 *             transactionId:
 *               type: string
 *             paymentDate:
 *               type: string
 *               format: date-time
 *           description: Details of the payment transaction
 *         deliveryType:
 *           type: string
 *           enum: [dine_in, takeaway, delivery, STANDARD, pickup, PICKUP, DELIVERY]
 *           description: Type of delivery
 *         deliveryAddress:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *           description: Delivery address for delivery orders
 *         tableNumber:
 *           type: number
 *           description: Table number for dine-in orders
 *         estimatedDeliveryTime:
 *           type: string
 *           format: date-time
 *           description: Estimated time of delivery
 *         actualDeliveryTime:
 *           type: string
 *           format: date-time
 *           description: Actual time of delivery
 *         specialInstructions:
 *           type: string
 *           description: Special instructions for the entire order
 *         feedback:
 *           type: string
 *           description: Reference to feedback for this order
 */

// Define delivery address schema
const deliveryAddressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  additionalInfo: {
    type: String,
    trim: true
  }
}, { _id: false });

// Define order item schema
const orderItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String, 
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  customizations: [
    {
      name: { type: String },
      option: { type: String },
      price: { type: Number, default: 0 }
    }
  ],
  specialInstructions: {
    type: String,
    trim: true
  }
}, { _id: true });

// Define status history schema
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  note: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: false });

// Define feedback schema
const feedbackSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Define main order schema
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Order must contain at least one item'
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0
  },
  discount: { 
    type: Number,
    min: 0,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'],
    default: 'pending',
    required: true
  },
  statusHistory: {
    type: [statusHistorySchema],
    default: []
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'mobile_payment'],
    default: 'cash',
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: { type: String },
    paymentDate: { type: Date }
  },
  deliveryType: {
    type: String,
    enum: ['delivery', 'dine_in', 'takeout', 'STANDARD', 'pickup', 'PICKUP', 'DELIVERY'],
    default: 'dine_in',
    required: true
  },
  deliveryAddress: {
    type: deliveryAddressSchema,
    required: function() {
      return this.deliveryType === 'delivery';
    }
  },
  tableNumber: {
    type: Number,
    min: 1,
    required: function() {
      return this.deliveryType === 'dine_in';
    }
  },
  estimatedDeliveryTime: {
    type: Date
  },
  actualDeliveryTime: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  specialInstructions: {
    type: String,
    trim: true
  },
  feedback: {
    type: feedbackSchema
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to generate order number if not exists
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    // ORD-2023-0001 format
    const year = new Date().getFullYear();
    
    // Find highest order number for this year
    const prefix = `ORD-${year}-`;
    const highestOrder = await this.constructor.findOne(
      { orderNumber: { $regex: `^${prefix}` } }, 
      { orderNumber: 1 }, 
      { sort: { orderNumber: -1 } }
    );
    
    let sequenceNumber = 1;
    if (highestOrder && highestOrder.orderNumber) {
      // Extract and increment sequence number
      const currentSequence = parseInt(highestOrder.orderNumber.substring(prefix.length));
      if (!isNaN(currentSequence)) {
        sequenceNumber = currentSequence + 1;
      }
    }
    
    // Format with leading zeros (4 digits)
    this.orderNumber = `${prefix}${sequenceNumber.toString().padStart(4, '0')}`;
  }
  next();
});

// Virtual for order age (time since creation)
orderSchema.virtual('orderAge').get(function() {
  return new Date() - this.createdAt;
});

// Virtual for delayed order status
orderSchema.virtual('isDelayed').get(function() {
  if (!this.estimatedDeliveryTime) return false;
  return new Date() > this.estimatedDeliveryTime && 
         !['delivered', 'completed', 'cancelled'].includes(this.status);
});

// Virtual for order progress percentage
orderSchema.virtual('progressPercentage').get(function() {
  const statusValues = {
    'pending': 0,
    'confirmed': 20,
    'preparing': 40,
    'ready': 60,
    'delivered': 80,
    'completed': 100,
    'cancelled': 0
  };
  
  return statusValues[this.status] || 0;
});

// Create index for efficient queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

// Create and export the Order model
const orderModel = mongoose.model('Order', orderSchema);

export { orderModel };
