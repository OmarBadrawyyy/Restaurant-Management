import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - order
 *         - amount
 *         - paymentMethod
 *         - status
 *       properties:
 *         order:
 *           type: string
 *           description: Reference to the order this payment is for
 *         user:
 *           type: string
 *           description: Reference to the user who made the payment
 *         amount:
 *           type: number
 *           description: Payment amount
 *         currency:
 *           type: string
 *           default: USD
 *           description: Payment currency
 *         paymentMethod:
 *           type: string
 *           enum: [credit_card, debit_card, cash, paypal, gift_card, loyalty_points, other]
 *           description: Method of payment
 *         paymentMethodDetails:
 *           type: object
 *           properties:
 *             cardType:
 *               type: string
 *             lastFour:
 *               type: string
 *             expiryMonth:
 *               type: string
 *             expiryYear:
 *               type: string
 *           description: Additional details about the payment method
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, refunded, partially_refunded]
 *           description: Current status of the payment
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
 *         transactionId:
 *           type: string
 *           description: External payment processor transaction ID
 *         receiptUrl:
 *           type: string
 *           description: URL to the payment receipt
 *         refundAmount:
 *           type: number
 *           description: Amount refunded (if applicable)
 *         refundReason:
 *           type: string
 *           description: Reason for refund (if applicable)
 *         refundTransactionId:
 *           type: string
 *           description: Transaction ID for the refund
 *         billingAddress:
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
 *           description: Billing address for the payment
 *         notes:
 *           type: string
 *           description: Additional notes about the payment
 *         metadata:
 *           type: object
 *           description: Additional metadata from payment processor
 */
const paymentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true,
        minlength: 3,
        maxlength: 3
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'debit_card', 'cash', 'paypal', 'gift_card', 'loyalty_points', 'other'],
        required: true
    },
    paymentMethodDetails: {
        cardType: String,
        lastFour: {
            type: String,
            match: [/^\d{4}$/, 'Last four digits must be numeric']
        },
        expiryMonth: {
            type: String,
            match: [/^(0[1-9]|1[0-2])$/, 'Expiry month must be between 01-12']
        },
        expiryYear: {
            type: String,
            match: [/^\d{4}$/, 'Expiry year must be 4 digits']
        }
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'],
        required: true,
        default: 'pending'
    },
    statusHistory: [{
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'],
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now,
            required: true
        },
        note: String
    }],
    transactionId: {
        type: String,
        trim: true
    },
    receiptUrl: {
        type: String,
        trim: true
    },
    refundAmount: {
        type: Number,
        min: 0
    },
    refundReason: {
        type: String,
        trim: true
    },
    refundTransactionId: {
        type: String,
        trim: true
    },
    billingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: {
            type: String,
            default: 'USA'
        }
    },
    notes: {
        type: String,
        trim: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for checking if payment is refunded
paymentSchema.virtual('isRefunded').get(function() {
    return this.status === 'refunded';
});

// Virtual for checking if payment is partially refunded
paymentSchema.virtual('isPartiallyRefunded').get(function() {
    return this.status === 'partially_refunded';
});

// Virtual for calculating refund percentage
paymentSchema.virtual('refundPercentage').get(function() {
    if (!this.refundAmount || this.refundAmount <= 0) return 0;
    return (this.refundAmount / this.amount) * 100;
});

// Method to update payment status
paymentSchema.methods.updateStatus = function(newStatus, note = '') {
    // Add to status history
    this.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note
    });
    
    // Update current status
    this.status = newStatus;
    
    return this.save();
};

// Method to process refund
paymentSchema.methods.processRefund = function(amount, reason, transactionId) {
    if (amount > this.amount) {
        throw new Error('Refund amount cannot exceed original payment amount');
    }
    
    this.refundAmount = amount;
    this.refundReason = reason;
    this.refundTransactionId = transactionId;
    
    // Update status based on refund amount
    if (amount === this.amount) {
        return this.updateStatus('refunded', `Full refund: ${reason}`);
    } else {
        return this.updateStatus('partially_refunded', `Partial refund (${amount}): ${reason}`);
    }
};

// Pre-save middleware to add initial status to history
paymentSchema.pre('save', function(next) {
    // If this is a new document and statusHistory is empty, add the initial status
    if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
        this.statusHistory = [{
            status: this.status,
            timestamp: new Date(),
            note: 'Payment initiated'
        }];
    }
    
    next();
});

// Indexes for faster queries
paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ 'statusHistory.timestamp': -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ createdAt: -1 });

const paymentModel = mongoose.model('Payment', paymentSchema);

export { paymentModel }; 