import mongoose from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       required:
 *         - tableId
 *         - userId
 *         - date
 *         - time
 *         - guestCount
 *       properties:
 *         tableId:
 *           type: string
 *           description: ID of the table being booked
 *         userId:
 *           type: string
 *           description: ID of the user making the booking
 *         date:
 *           type: string
 *           format: date
 *           description: Date of the booking
 *         time:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Time of the booking (HH:MM format)
 *         guestCount:
 *           type: integer
 *           minimum: 1
 *           description: Number of guests
 *         specialRequests:
 *           type: string
 *           description: Any special requests for the booking
 *         status:
 *           type: string
 *           enum: [pending, confirmed, seated, completed, cancelled, no_show]
 *           default: pending
 *           description: Current status of the booking
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
 *         occasion:
 *           type: string
 *           enum: [birthday, anniversary, business, date, family, other]
 *           description: Special occasion for the booking
 *         duration:
 *           type: integer
 *           description: Expected duration of the booking in minutes
 *         arrivalTime:
 *           type: string
 *           format: date-time
 *           description: When the guests actually arrived
 *         departureTime:
 *           type: string
 *           format: date-time
 *           description: When the guests left
 *         reminderSent:
 *           type: boolean
 *           description: Whether a reminder has been sent
 *         confirmationCode:
 *           type: string
 *           description: Unique confirmation code for the booking
 *         source:
 *           type: string
 *           enum: [website, phone, walk_in, third_party]
 *           description: Source of the booking
 *         contactPhone:
 *           type: string
 *           description: Contact phone number for the booking
 *         contactEmail:
 *           type: string
 *           description: Contact email for the booking
 *         notes:
 *           type: string
 *           description: Staff notes about the booking
 */
const BookingSchema = new mongoose.Schema({
    tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    guestCount: {
        type: Number,
        required: true,
        min: 1
    },
    specialRequests: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
        default: 'pending'
    },
    statusHistory: [
        {
            status: { 
                type: String,
                enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
                required: true
            },
            timestamp: { 
                type: Date, 
                default: Date.now,
                required: true
            },
            note: { type: String }
        }
    ],
    occasion: {
        type: String,
        enum: ['birthday', 'anniversary', 'business', 'date', 'family', 'other']
    },
    duration: {
        type: Number,
        default: 90, // Default duration in minutes
        min: 30
    },
    arrivalTime: {
        type: Date
    },
    departureTime: {
        type: Date
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    confirmationCode: {
        type: String,
        unique: true
    },
    source: {
        type: String,
        enum: ['website', 'phone', 'walk_in', 'third_party'],
        default: 'website'
    },
    contactPhone: {
        type: String
    },
    contactEmail: {
        type: String,
        match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    },
    notes: {
        type: String
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Generate a unique confirmation code before saving
BookingSchema.pre('save', async function(next) {
    // Only generate a confirmation code if it doesn't exist
    if (!this.confirmationCode) {
        // Generate a random 6-character alphanumeric code
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        this.confirmationCode = code;
    }

    // Add status change to history if status is modified or new document
    if (this.isModified('status') || this.isNew) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date(),
            note: 'Status updated'
        });
    }

    next();
});

// Virtual for full booking datetime
BookingSchema.virtual('bookingDateTime').get(function() {
    if (!this.date || !this.time) return null;
    
    const [hours, minutes] = this.time.split(':').map(Number);
    const dateTime = new Date(this.date);
    dateTime.setHours(hours, minutes, 0, 0);
    
    return dateTime;
});

// Virtual for checking if booking is upcoming
BookingSchema.virtual('isUpcoming').get(function() {
    if (!this.bookingDateTime) return false;
    
    return this.bookingDateTime > new Date() && 
           this.status !== 'cancelled' && 
           this.status !== 'completed' &&
           this.status !== 'no_show';
});

// Virtual for checking if booking is late
BookingSchema.virtual('isLate').get(function() {
    if (!this.bookingDateTime) return false;
    
    const fifteenMinutesAfterBooking = new Date(this.bookingDateTime);
    fifteenMinutesAfterBooking.setMinutes(fifteenMinutesAfterBooking.getMinutes() + 15);
    
    return new Date() > fifteenMinutesAfterBooking && 
           this.status === 'confirmed' && 
           !this.arrivalTime;
});

// Indexes for faster queries
BookingSchema.index({ userId: 1 });
BookingSchema.index({ tableId: 1 });
BookingSchema.index({ date: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ confirmationCode: 1 });

const bookingModel = mongoose.model('Booking', BookingSchema);

export { bookingModel };