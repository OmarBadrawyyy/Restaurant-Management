import mongoose from "mongoose";
import { sanitizeInput } from '../utils/sanitizer.js';
import logger from '../config/logger.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Table:
 *       type: object
 *       required:
 *         - tableNumber
 *         - capacity
 *       properties:
 *         tableNumber:
 *           type: number
 *           description: Unique identifier for the table
 *         capacity:
 *           type: number
 *           description: Maximum number of people the table can accommodate
 *         status:
 *           type: string
 *           enum: [available, occupied, reserved, maintenance]
 *           description: Current status of the table
 *         section:
 *           type: string
 *           enum: [indoor, outdoor, bar, private, terrace, window]
 *           description: Section of the restaurant where the table is located
 *         shape:
 *           type: string
 *           enum: [round, square, rectangular, oval]
 *           description: Shape of the table
 *         features:
 *           type: array
 *           items:
 *             type: string
 *             enum: [wheelchair_accessible, near_window, quiet, near_kitchen, near_bathroom, private]
 *           description: Special features of the table
 *         minSpendRequired:
 *           type: number
 *           description: Minimum spend required for this table (if applicable)
 *         currentOccupancy:
 *           type: number
 *           description: Current number of people at the table
 *         occupiedSince:
 *           type: string
 *           format: date-time
 *           description: When the table was occupied (if status is occupied)
 *         reservedUntil:
 *           type: string
 *           format: date-time
 *           description: Until when the table is reserved (if status is reserved)
 *         isActive:
 *           type: boolean
 *           description: Whether the table is active in the system
 */
const tableSchema = new mongoose.Schema({
    tableNumber: {
        type: Number,
        required: true,
        unique: true,
    },
    capacity: {
        type: Number,
        required: true,
        min: 1,
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'reserved', 'maintenance'],
        default: 'available'
    },
    section: {
        type: String,
        required: true,
        enum: ['indoor', 'outdoor', 'balcony', 'private']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    currentOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    currentReservation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reservation',
        default: null
    },
    lastCleaned: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Add indexes for common queries
tableSchema.index({ status: 1, section: 1 });
tableSchema.index({ tableNumber: 1 }, { unique: true });

// Add methods to check table availability
tableSchema.methods.isAvailable = function() {
    return this.status === 'available' && this.isActive;
};

tableSchema.methods.canBeReserved = function() {
    return ['available', 'maintenance'].includes(this.status) && this.isActive;
};

// Pre-save middleware to validate table number
tableSchema.pre('save', async function(next) {
    if (this.isNew) {
        const existingTable = await this.constructor.findOne({ tableNumber: this.tableNumber });
        if (existingTable) {
            throw new Error('Table number already exists');
        }
    }
    next();
});

// Virtual for checking if table is available for reservation
tableSchema.virtual('isAvailableForReservation').get(function() {
    return this.status === 'available' && this.isActive;
});

// Virtual for calculating how long the table has been occupied
tableSchema.virtual('occupationDuration').get(function() {
    if (this.status !== 'occupied' || !this.occupiedSince) return 0;
    return Math.floor((new Date() - this.occupiedSince) / (1000 * 60)); // Duration in minutes
});

// Static method to find available tables with filtering
tableSchema.statics.findAvailableTables = function(filters = {}, options = {}) {
    try {
        const query = { 
            status: 'available',
            isActive: true
        };
        
        // Add capacity filter if provided
        if (filters.minCapacity) {
            query.capacity = { $gte: parseInt(filters.minCapacity) };
        }
        
        // Add section filter if provided
        if (filters.section && ['indoor', 'outdoor', 'bar', 'private', 'terrace', 'window'].includes(filters.section)) {
            query.section = filters.section;
        }
        
        // Add features filter if provided
        if (filters.features && Array.isArray(filters.features) && filters.features.length > 0) {
            query.features = { $all: filters.features };
        }
        
        // Set query timeout
        const queryOptions = { 
            maxTimeMS: options.timeout || 5000 // Default 5 second timeout
        };
        
        return this.find(query, null, queryOptions).sort({ tableNumber: 1 });
    } catch (error) {
        logger.error(`Error finding available tables: ${error.message}`, {
            error: error.stack,
            filters
        });
        throw error;
    }
};

// Method to mark table as occupied
tableSchema.methods.occupy = function(occupancyCount) {
    if (occupancyCount > this.capacity) {
        throw new Error(`Occupancy count cannot exceed table capacity of ${this.capacity}`);
    }
    
    this.status = 'occupied';
    this.currentOccupancy = occupancyCount || 1;
    this.occupiedSince = new Date();
    this.reservedUntil = null;
    
    return this.save();
};

// Method to mark table as available
tableSchema.methods.release = function() {
    this.status = 'available';
    this.currentOccupancy = 0;
    this.occupiedSince = null;
    this.reservedUntil = null;
    
    return this.save();
};

// Method to reserve a table
tableSchema.methods.reserve = function(until) {
    if (!until || !(until instanceof Date) || until <= new Date()) {
        throw new Error('A valid future date is required for reservation');
    }
    
    this.status = 'reserved';
    this.reservedUntil = until;
    
    return this.save();
};

// Pre-save middleware to update occupiedSince when status changes to occupied
tableSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        if (this.status === 'occupied' && !this.occupiedSince) {
            this.occupiedSince = new Date();
        } else if (this.status !== 'occupied') {
            this.occupiedSince = null;
        }
    }
    
    // Ensure currentOccupancy is not greater than capacity
    if (this.currentOccupancy > this.capacity) {
        this.currentOccupancy = this.capacity;
    }
    
    // Ensure status is consistent with occupancy
    if (this.status === 'occupied' && this.currentOccupancy === 0) {
        this.status = 'available';
    }
    
    // Remove any invalid features
    if (this.features && Array.isArray(this.features)) {
        const validFeatures = ['wheelchair_accessible', 'near_window', 'quiet', 'near_kitchen', 'near_bathroom', 'private'];
        this.features = this.features.filter(feature => validFeatures.includes(feature));
    }
    
    next();
});

// Indexes for faster queries
tableSchema.index({ tableNumber: 1 });
tableSchema.index({ status: 1, isActive: 1 });
tableSchema.index({ capacity: 1, status: 1 });
tableSchema.index({ section: 1, status: 1 });
tableSchema.index({ features: 1 });
tableSchema.index({ capacity: 1, status: 1, section: 1 });

const Table = mongoose.model('Table', tableSchema);

export { Table as tableModel };
