import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     MenuItem:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - category
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the menu item
 *         description:
 *           type: string
 *           description: Detailed description of the menu item
 *         price:
 *           type: number
 *           description: Price of the menu item
 *         category:
 *           type: string
 *           enum: [starter, main, dessert, drink, special]
 *           description: Category of the menu item
 *         ingredients:
 *           type: array
 *           items:
 *             type: string
 *           description: List of ingredients used in the menu item
 *         image:
 *           type: string
 *           description: URL to the image of the menu item
 *         dietaryInfo:
 *           type: array
 *           items:
 *             type: string
 *             enum: [vegetarian, vegan, gluten-free, dairy-free, nut-free, low-carb, keto, paleo]
 *           description: Dietary information about the menu item
 *         allergens:
 *           type: array
 *           items:
 *             type: string
 *             enum: [gluten, dairy, nuts, eggs, soy, fish, shellfish, sesame]
 *           description: List of allergens present in the menu item
 *         calories:
 *           type: number
 *           description: Caloric content of the menu item
 *         preparationTime:
 *           type: number
 *           description: Estimated preparation time in minutes
 *         isAvailable:
 *           type: boolean
 *           default: true
 *           description: Whether the item is currently available
 *         isPopular:
 *           type: boolean
 *           default: false
 *           description: Whether the item is marked as popular
 *         isSpecial:
 *           type: boolean
 *           default: false
 *           description: Whether the item is a special/featured item
 *         customizationOptions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *           description: Available customization options for the menu item
 *         ratings:
 *           type: object
 *           properties:
 *             average:
 *               type: number
 *               default: 0
 *             count:
 *               type: number
 *               default: 0
 *           description: Rating statistics for the menu item
 */
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: [true, 'Category is required']
  },
  imageUrl: {
    type: String,
    default: ''
  },
  ingredients: [{
    type: String,
    trim: true
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isVegetarian: {
    type: Boolean,
    default: false
  },
  isVegan: {
    type: Boolean,
    default: false
  },
  isGlutenFree: {
    type: Boolean,
    default: false
  },
  isSpicy: {
    type: Boolean,
    default: false
  },
  preparationTime: {
    type: Number,
    min: 0,
    default: 0
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  nutrition: {
    calories: {
      type: Number,
      min: 0,
      default: 0
    },
    protein: {
      type: Number,
      min: 0,
      default: 0
    },
    carbs: {
      type: Number,
      min: 0,
      default: 0
    },
    fat: {
      type: Number,
      min: 0,
      default: 0
    },
    allergens: [{
      type: String,
      trim: true
    }]
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discounted price
menuItemSchema.virtual('discountedPrice').get(function() {
  return this.discountPercentage > 0 
    ? +(this.price * (1 - this.discountPercentage / 100)).toFixed(2)
    : this.price;
});

// Virtual for "new" status
menuItemSchema.virtual('isNew').get(function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.createdAt >= thirtyDaysAgo;
});

// Pre-save hook for data validation
menuItemSchema.pre('save', function(next) {
  // Format price to 2 decimal places
  this.price = parseFloat(parseFloat(this.price).toFixed(2));
  
  // Trim category ID if it's a string
  if (typeof this.category === 'string') {
    this.category = this.category.trim();
  }
  
  next();
});

// Indexes for performance
menuItemSchema.index({ name: 1 });
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ isAvailable: 1 });
menuItemSchema.index({ isFeatured: 1 });
menuItemSchema.index({ price: 1 });

// Create the model
export const menuItemModel = mongoose.model('MenuItem', menuItemSchema);

export default menuItemModel;
