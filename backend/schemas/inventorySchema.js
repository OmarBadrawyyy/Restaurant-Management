import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Inventory:
 *       type: object
 *       required:
 *         - name
 *         - currentStock
 *         - unit
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the inventory item
 *         category:
 *           type: string
 *           enum: [ingredient, beverage, supplies, equipment]
 *           description: Category of the inventory item
 *         currentStock:
 *           type: number
 *           description: Current quantity in stock
 *         unit:
 *           type: string
 *           description: Unit of measurement (e.g., kg, liters, pieces)
 *         minStockLevel:
 *           type: number
 *           description: Minimum stock level before reordering
 *         reorderPoint:
 *           type: number
 *           description: Stock level at which to reorder
 *         costPerUnit:
 *           type: number
 *           description: Cost per unit of the item
 *         supplier:
 *           type: string
 *           description: Supplier of the item
 *         supplierContact:
 *           type: string
 *           description: Contact information for the supplier
 *         location:
 *           type: string
 *           description: Storage location in the restaurant
 *         expiryDate:
 *           type: string
 *           format: date
 *           description: Expiry date of the item (if applicable)
 *         lastRestockDate:
 *           type: string
 *           format: date-time
 *           description: Date and time of the last restock
 *         stockHistory:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *               quantity:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [restock, usage, adjustment, waste]
 *               user:
 *                 type: string
 *               note:
 *                 type: string
 *           description: History of stock changes
 *         isActive:
 *           type: boolean
 *           description: Whether the item is active in inventory
 *         menuItemsUsing:
 *           type: array
 *           items:
 *             type: string
 *           description: Menu items that use this inventory item
 */
const inventorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    category: {
        type: String,
        enum: ['ingredient', 'beverage', 'supplies', 'equipment'],
        required: true
    },
    currentStock: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        required: true,
        trim: true
    },
    minStockLevel: {
        type: Number,
        min: 0,
        default: 0
    },
    reorderPoint: {
        type: Number,
        min: 0,
        default: 10
    },
    costPerUnit: {
        type: Number,
        min: 0
    },
    supplier: {
        type: String,
        trim: true
    },
    supplierContact: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    expiryDate: {
        type: Date
    },
    lastRestockDate: {
        type: Date
    },
    stockHistory: [
        {
            date: {
                type: Date,
                default: Date.now,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            type: {
                type: String,
                enum: ['restock', 'usage', 'adjustment', 'waste'],
                required: true
            },
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            note: {
                type: String
            }
        }
    ],
    isActive: {
        type: Boolean,
        default: true
    },
    menuItemsUsing: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem'
    }]
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for checking if item is low in stock
inventorySchema.virtual('isLowStock').get(function() {
    return this.currentStock <= this.minStockLevel;
});

// Virtual for checking if item needs reordering
inventorySchema.virtual('needsReorder').get(function() {
    return this.currentStock <= this.reorderPoint;
});

// Virtual for calculating days until expiry
inventorySchema.virtual('daysUntilExpiry').get(function() {
    if (!this.expiryDate) return null;
    const today = new Date();
    const expiryDate = new Date(this.expiryDate);
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for calculating total value
inventorySchema.virtual('totalValue').get(function() {
    if (this.costPerUnit === undefined) return null;
    return this.currentStock * this.costPerUnit;
});

// Pre-save middleware to update lastRestockDate when adding restock to history
inventorySchema.pre('save', function(next) {
    const lastHistoryEntry = this.stockHistory[this.stockHistory.length - 1];
    if (lastHistoryEntry && lastHistoryEntry.type === 'restock') {
        this.lastRestockDate = lastHistoryEntry.date;
    }
    next();
});

// Method to update stock
inventorySchema.methods.updateStock = function(quantity, type, userId, note) {
    // Add to stock history
    this.stockHistory.push({
        date: new Date(),
        quantity,
        type,
        user: userId,
        note: note || ''
    });

    // Update current stock based on type
    if (type === 'restock') {
        this.currentStock += quantity;
        this.lastRestockDate = new Date();
    } else if (type === 'usage' || type === 'waste') {
        this.currentStock = Math.max(0, this.currentStock - quantity);
    } else if (type === 'adjustment') {
        this.currentStock = Math.max(0, this.currentStock + quantity); // quantity can be negative
    }

    return this.save();
};

// Indexes for faster queries
inventorySchema.index({ name: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ isActive: 1 });
inventorySchema.index({ currentStock: 1 });
inventorySchema.index({ expiryDate: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);

export { Inventory as inventoryModel }; 