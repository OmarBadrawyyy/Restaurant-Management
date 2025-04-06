import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Menu:
 *       type: object
 *       required:
 *         - name
 *         - items
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the menu
 *         items:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of menu item IDs
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the menu is currently active
 *         category:
 *           type: string
 *           enum: [breakfast, lunch, dinner, special, seasonal]
 *           description: Category of the menu
 *         description:
 *           type: string
 *           description: Description of the menu
 */
const menuSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for fetching items in this category
menuSchema.virtual('items', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'category'
});

// Index for faster queries
menuSchema.index({ name: 1 });
menuSchema.index({ isActive: 1 });
menuSchema.index({ displayOrder: 1 });

const menuModel = mongoose.model('Menu', menuSchema);

export { menuModel };  
