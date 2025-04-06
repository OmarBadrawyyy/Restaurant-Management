// feedbackSchema.js
import mongoose from 'mongoose';
import validator from 'validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     Feedback:
 *       type: object
 *       required:
 *         - userId
 *         - rating
 *       properties:
 *         userId:
 *           type: string
 *           description: ID of the user providing feedback
 *         orderId:
 *           type: string
 *           description: ID of the order being reviewed (optional)
 *         bookingId:
 *           type: string
 *           description: ID of the booking being reviewed (optional)
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Overall rating from 1 to 5
 *         comment:
 *           type: string
 *           description: General comment about the experience
 *         categoryRatings:
 *           type: object
 *           properties:
 *             food:
 *               type: number
 *               minimum: 1
 *               maximum: 5
 *             service:
 *               type: number
 *               minimum: 1
 *               maximum: 5
 *             ambience:
 *               type: number
 *               minimum: 1
 *               maximum: 5
 *             cleanliness:
 *               type: number
 *               minimum: 1
 *               maximum: 5
 *             value:
 *               type: number
 *               minimum: 1
 *               maximum: 5
 *           description: Ratings for specific categories
 *         photos:
 *           type: array
 *           items:
 *             type: string
 *           description: URLs to photos uploaded with the feedback
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags associated with the feedback
 *         isPublic:
 *           type: boolean
 *           description: Whether the feedback is public or private
 *         sentiment:
 *           type: string
 *           enum: [positive, neutral, negative]
 *           description: Sentiment analysis of the feedback
 *         staffResponse:
 *           type: object
 *           properties:
 *             responder:
 *               type: string
 *             response:
 *               type: string
 *             responseDate:
 *               type: string
 *               format: date-time
 *           description: Staff response to the feedback
 *         isResolved:
 *           type: boolean
 *           description: Whether any issues in the feedback have been resolved
 */
const feedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        // Modified validation to allow more content while still protecting against XSS
        validate: {
            validator: function(v) {
                if (!v) return true;
                // Only check for the most dangerous script tags instead of full escaping
                return !/<script|javascript:|onerror=|onclick=|onload=/i.test(v);
            },
            message: 'Comment contains potentially dangerous content'
        },
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    categoryRatings: {
        food: {
            type: Number,
            min: 1,
            max: 5
        },
        service: {
            type: Number,
            min: 1,
            max: 5
        },
        ambience: {
            type: Number,
            min: 1,
            max: 5
        },
        cleanliness: {
            type: Number,
            min: 1,
            max: 5
        },
        value: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    photos: {
        type: [{
            type: String,
            // Add URL validation to prevent malicious URLs
            validate: {
                validator: function(v) {
                    return v ? validator.isURL(v, { protocols: ['http', 'https'], require_protocol: true }) : true;
                },
                message: 'Invalid URL format for photo'
            }
        }],
        // Add size limit for photos array
        validate: {
            validator: function(v) {
                return v ? v.length <= 5 : true;
            },
            message: 'Cannot upload more than 5 photos'
        }
    },
    tags: {
        type: [{
            type: String,
            trim: true,
            maxlength: [20, 'Tag cannot exceed 20 characters']
        }],
        // Add size limit for tags array
        validate: {
            validator: function(v) {
                return v ? v.length <= 10 : true;
            },
            message: 'Cannot add more than 10 tags'
        }
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative']
    },
    staffResponse: {
        responder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        response: {
            type: String,
            trim: true,
            // Modified validation to allow more content while still protecting against XSS
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    // Only check for the most dangerous script tags instead of full escaping
                    return !/<script|javascript:|onerror=|onclick=|onload=/i.test(v);
                },
                message: 'Response contains potentially dangerous content'
            },
            maxlength: [2000, 'Response cannot exceed 2000 characters']
        },
        responseDate: {
            type: Date
        },
        responderName: {
            type: String,
            default: 'Staff'
        }
    },
    isResolved: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Pre-save middleware to determine sentiment based on rating
feedbackSchema.pre('save', function(next) {
    if (this.isModified('rating') || this.isNew) {
        if (this.rating >= 4) {
            this.sentiment = 'positive';
        } else if (this.rating === 3) {
            this.sentiment = 'neutral';
        } else {
            this.sentiment = 'negative';
        }
    }
    next();
});

// Virtual for checking if feedback has a staff response
feedbackSchema.virtual('hasResponse').get(function() {
    return !!(this.staffResponse && this.staffResponse.response);
});

// Virtual for calculating response time
feedbackSchema.virtual('responseTime').get(function() {
    if (!this.staffResponse || !this.staffResponse.responseDate) return null;
    return this.staffResponse.responseDate - this.createdAt;
});

// Add indexes for better query performance
feedbackSchema.index({ userId: 1 });
feedbackSchema.index({ orderId: 1 });
feedbackSchema.index({ bookingId: 1 });
feedbackSchema.index({ sentiment: 1 });
feedbackSchema.index({ isResolved: 1 });

// Create the model
const feedbackModel = mongoose.model('Feedback', feedbackSchema);

// Export the model
export { feedbackModel };

// Default export for flexibility
export default feedbackModel; 
