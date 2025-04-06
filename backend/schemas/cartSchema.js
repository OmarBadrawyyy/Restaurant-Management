import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Cart:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID the cart belongs to
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - menuItemId
 *               - quantity
 *             properties:
 *               menuItemId:
 *                 type: string
 *                 description: ID of the menu item
 *               name:
 *                 type: string
 *                 description: Name of the menu item
 *               price:
 *                 type: number
 *                 description: Price of the menu item
 *               quantity:
 *                 type: integer
 *                 description: Quantity of the menu item
 *               customizations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Name of the customization
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Selected options for this customization
 *                     price:
 *                       type: number
 *                       description: Additional price for this customization
 *               totalItemPrice:
 *                 type: number
 *                 description: Total price for this item (with customizations)
 *         totalAmount:
 *           type: number
 *           description: Total amount of the cart
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the cart was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the cart was last updated
 */
const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [{
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    image: {
      type: String
    },
    customizations: [{
      name: {
        type: String,
        required: true
      },
      options: [String],
      price: {
        type: Number,
        default: 0
      }
    }],
    totalItemPrice: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  specialInstructions: {
    type: String
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  sessionId: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'abandoned', 'converted', 'expired'],
    default: 'active',
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

// Create a compound index on userId and status
cartSchema.index({ userId: 1, status: 1 });

// Auto-update totalAmount when items change
cartSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => {
      return total + (item.totalItemPrice * item.quantity);
    }, 0);
  } else {
    this.totalAmount = 0;
  }
  
  next();
});

/**
 * Add item to cart
 * @param {Object} menuItem - Menu item to add
 * @param {Number} quantity - Quantity to add
 * @param {String} specialInstructions - Special instructions for the item
 * @param {Array} customizations - Array of customization objects
 * @returns {Object} - Updated cart
 */
cartSchema.methods.addItem = function(menuItem, quantity = 1, specialInstructions = '', customizations = []) {
  // Calculate total customization price
  const customizationTotal = customizations.reduce((total, customization) => {
    return total + (customization.price || 0);
  }, 0);

  // Calculate item price including customizations
  const totalItemPrice = menuItem.price + customizationTotal;

  // Check if item already exists in cart
  const existingItemIndex = this.items.findIndex(
    item => item.menuItemId.toString() === menuItem._id.toString() && 
    JSON.stringify(item.customizations) === JSON.stringify(customizations)
  );

  if (existingItemIndex > -1) {
    // Update existing item quantity
    this.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item to cart
    this.items.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      image: menuItem.image,
      quantity: quantity,
      customizations: customizations,
      totalItemPrice: totalItemPrice
    });
  }

  // Update cart total
  this.updateTotalAmount();

  // Update special instructions if provided
  if (specialInstructions) {
    this.specialInstructions = specialInstructions;
  }

  return this;
};

/**
 * Remove item from cart
 * @param {String} itemId - ID of the item to remove
 * @returns {Object} - Updated cart
 */
cartSchema.methods.removeItem = function(itemId) {
  // Find the item index
  const itemIndex = this.items.findIndex(item => item._id.toString() === itemId);
  
  if (itemIndex > -1) {
    // Remove the item from the array
    this.items.splice(itemIndex, 1);
    
    // Update cart total
    this.updateTotalAmount();
  }
  
  return this;
};

/**
 * Update item quantity
 * @param {String} itemId - ID of the item to update
 * @param {Number} quantity - New quantity
 * @returns {Object} - Updated cart
 */
cartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  // Find the item
  const itemIndex = this.items.findIndex(item => item._id.toString() === itemId);
  
  if (itemIndex > -1) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      this.items.splice(itemIndex, 1);
    } else {
      // Update item quantity
      this.items[itemIndex].quantity = quantity;
    }
    
    // Update cart total
    this.updateTotalAmount();
  }
  
  return this;
};

/**
 * Clear all items from cart
 * @returns {Object} - Updated cart
 */
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.totalAmount = 0;
  this.specialInstructions = '';
  
  return this;
};

/**
 * Apply promotion to cart
 * @param {Object} promotion - Promotion object
 * @returns {Object} - Updated cart
 */
cartSchema.methods.applyPromotion = function(promotion) {
  // Check if promotion is applicable based on cart total
  if (promotion.minimumPurchase && this.totalAmount < promotion.minimumPurchase) {
    throw new Error(`Minimum purchase amount of ${promotion.minimumPurchase} required for this promotion`);
  }
  
  // Store promotion in cart
  this.promotion = {
    code: promotion.code,
    type: promotion.type,
    value: promotion.value,
    name: promotion.name
  };
  
  // Apply discount based on promotion type
  if (promotion.type === 'percentage') {
    this.discountAmount = (this.totalAmount * promotion.value) / 100;
  } else if (promotion.type === 'fixed') {
    this.discountAmount = promotion.value;
  }
  
  // Ensure discount doesn't exceed cart total
  if (this.discountAmount > this.totalAmount) {
    this.discountAmount = this.totalAmount;
  }
  
  // Update total amount after discount
  this.finalAmount = this.totalAmount - this.discountAmount;
  
  return this;
};

/**
 * Update total amount
 * @returns {Number} - Updated total amount
 */
cartSchema.methods.updateTotalAmount = function() {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => {
      return total + (item.totalItemPrice * item.quantity);
    }, 0);
  } else {
    this.totalAmount = 0;
  }
  
  // If a promotion was applied, update discount and final amount
  if (this.promotion) {
    if (this.promotion.type === 'percentage') {
      this.discountAmount = (this.totalAmount * this.promotion.value) / 100;
    } else if (this.promotion.type === 'fixed') {
      this.discountAmount = this.promotion.value;
    }
    
    // Ensure discount doesn't exceed cart total
    if (this.discountAmount > this.totalAmount) {
      this.discountAmount = this.totalAmount;
    }
    
    this.finalAmount = this.totalAmount - this.discountAmount;
  } else {
    this.finalAmount = this.totalAmount;
  }
  
  return this.totalAmount;
};

const Cart = mongoose.model('Cart', cartSchema);

export { Cart as cartModel }; 