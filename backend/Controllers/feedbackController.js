import { feedbackModel } from '../schemas/feedbackSchema.js';  
import { userModel } from '../schemas/userSchema.js';
import logger from '../config/logger.js';
import { sanitizeHTML } from '../utils/sanitizer.js';

/**
 * Get all feedback with optimized projections for performance
 */
export const viewAllFeedback = async (req, res) => {
    try {
        // Extract query parameters for filtering
        const { page = 1, limit = 20, sentiment, isResolved, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        // Create filter object
        const filter = {};
        if (sentiment) filter.sentiment = sentiment;
        if (isResolved !== undefined) filter.isResolved = isResolved === 'true';
        
        // Define sort options
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Define projection to only return necessary fields
        const projection = {
            userId: 1,
            rating: 1,
            comment: 1,
            sentiment: 1,
            createdAt: 1,
            hasResponse: 1,
            isResolved: 1
        };

        // Execute query with pagination, filtering, and projection
        // Add maxTimeMS option to prevent long-running queries (5 second timeout)
        const feedback = await feedbackModel
            .find(filter, projection)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('userId', 'name email')
            .maxTimeMS(5000); // 5 second timeout for database query
            
        // Get total count for pagination with timeout
        const total = await feedbackModel
            .countDocuments(filter)
            .maxTimeMS(3000); // 3 second timeout for count query

        res.status(200).json({
            feedback,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        // Handle MongoDB timeout errors specifically
        if (error.name === 'MongooseError' && error.message.includes('timeout')) {
            logger.error(`Database query timeout: ${error.message}`, { error });
            return res.status(503).json({ 
                message: "Database query timed out. Please try again with a more specific query.",
                error: "Query timeout"
            });
        }
        
        logger.error(`Error retrieving feedback: ${error.message}`, { error });
        res.status(500).json({ message: "Failed to retrieve feedback", error: error.message });
    }
};

/**
 * Submit new feedback with improved validation and error handling
 */
export const submitFeedback = async (req, res) => {
    try {
        const { orderId, bookingId, comment, rating, categoryRatings, photos, tags } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!rating) {
            return res.status(400).json({ message: 'Rating is required' });
        }
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Double check for suspicious activity flagged by middleware
        if (req.suspiciousActivity) {
            logger.warn('Processing potentially suspicious feedback submission', {
                userId,
                ip: req.ip
            });
        }

        // Create a new feedback instance with sanitized data
        const newFeedback = new feedbackModel({
            userId,
            orderId,
            bookingId,
            comment: comment ? sanitizeHTML(comment) : undefined,
            rating,
            categoryRatings,
            photos, // Already sanitized by middleware
            tags    // Already sanitized by middleware
        });

        // Save to DB with timeout
        await newFeedback.save({ maxTimeMS: 5000 }); // 5 second timeout
        
        logger.info(`New feedback submitted by user ${userId}`, { 
            userId, 
            feedbackId: newFeedback._id,
            rating,
            suspicious: req.suspiciousActivity || false
        });

        return res.status(201).json({ 
            message: 'Thank you for your feedback',
            feedbackId: newFeedback._id
        });
    } catch (error) {
        // Handle MongoDB timeout errors specifically
        if (error.name === 'MongooseError' && error.message.includes('timeout')) {
            logger.error(`Database operation timeout: ${error.message}`, { 
                userId: req.user?._id,
                error
            });
            return res.status(503).json({ 
                message: "Database operation timed out. Please try again later.",
                error: "Operation timeout"
            });
        }
        
        logger.error(`Error submitting feedback: ${error.message}`, { 
            userId: req.user?._id,
            error
        });
        
        // Check for validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: 'Validation failed', 
                errors: validationErrors 
            });
        }
        
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

/**
 * Get feedback history for the current user
 */
export const getUserFeedbackHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        console.log(`Processing feedback history request for user ${userId}`, {
            userId: userId.toString(),
            page,
            limit,
            sortBy,
            sortOrder,
            url: req.originalUrl,
            path: req.path
        });
        
        if (!userId) {
            console.error('User ID not found in request');
            return res.status(400).json({
                success: false,
                message: "User ID not found in request",
                error: "Missing user ID"
            });
        }
        
        // Define sort options
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        console.log(`Querying feedback for user ${userId}`);
        
        // Find all feedback submitted by this user with pagination
        const feedback = await feedbackModel
            .find({ userId }, {
                rating: 1,
                comment: 1,
                categoryRatings: 1,
                tags: 1,
                createdAt: 1,
                hasResponse: 1,
                staffResponse: 1,
                isResolved: 1
            })
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .maxTimeMS(3000); // 3 second timeout
            
        console.log(`Found ${feedback.length} feedback items for user ${userId}`);
        
        // Get total count for pagination
        const total = await feedbackModel
            .countDocuments({ userId })
            .maxTimeMS(2000);
            
        logger.info(`Retrieved feedback history for user ${userId}`);
            
        return res.status(200).json({
            success: true,
            data: feedback,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        // Handle MongoDB timeout errors specifically
        if (error.name === 'MongooseError' && error.message.includes('timeout')) {
            logger.error(`Database query timeout: ${error.message}`, { error });
            return res.status(503).json({ 
                success: false,
                message: "Database query timed out. Please try again later.",
                error: "Query timeout"
            });
        }
        
        logger.error(`Error retrieving user feedback history: ${error.message}`, { 
            userId: req.user?._id,
            error,
            stack: error.stack
        });
        
        return res.status(500).json({ 
            success: false,
            message: "Failed to retrieve feedback history", 
            error: error.message 
        });
    }
};