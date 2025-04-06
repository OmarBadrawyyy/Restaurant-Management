import logger from '../config/logger.js';
import { feedbackModel } from '../schemas/feedbackSchema.js';
import mongoose from 'mongoose';

/**
 * Get all customer issues/feedback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllCustomerIssues = async (req, res) => {
  try {
    console.log('Fetching all customer issues...');
    
    // Build the filter object based on query parameters
    const filter = {};
    if (req.query.status) {
      filter.isResolved = req.query.status === 'resolved';
    }
    
    // Build the sort object based on query parameters
    const sort = {};
    if (req.query.sortBy === 'newest') {
      sort.createdAt = -1;
    } else if (req.query.sortBy === 'oldest') {
      sort.createdAt = 1;
    } else if (req.query.sortBy === 'highest') {
      sort.priority = -1;
    } else if (req.query.sortBy === 'lowest') {
      sort.priority = 1;
    } else {
      // Default sort is by newest
      sort.createdAt = -1;
    }
    
    // Log the filter and sort criteria
    console.log('Filter criteria:', JSON.stringify(filter));
    console.log('Sort criteria:', JSON.stringify(sort));
    
    // Fetch feedback from the database with populated user
    const feedback = await feedbackModel
      .find(filter)
      .populate({
        path: 'userId',
        select: 'fullName email',
        options: { strictPopulate: false }
      })
      .sort(sort)
      .lean(); // Use .lean() to get plain JavaScript objects instead of Mongoose documents
    
    console.log(`Found ${feedback.length} feedback records`);
    
    // Transform the feedback data to match the expected format for the frontend
    const transformedFeedback = feedback.map(item => transformToCustomerIssue(item));
    
    console.log(`Transformed ${transformedFeedback.length} records for the frontend`);
    return res.status(200).json({
      status: 'success',
      data: transformedFeedback
    });
  } catch (error) {
    console.error('Error in getAllCustomerIssues:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Error fetching customer issues', 
      error: error.message 
    });
  }
};

/**
 * Get a specific customer issue by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCustomerIssueById = async (req, res) => {
  try {
    const { issueId } = req.params;
    logger.info(`Fetching customer issue with ID: ${issueId}`);
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      logger.warn(`Invalid issue ID format: ${issueId}`);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid issue ID format'
      });
    }
    
    const feedback = await feedbackModel
      .findById(issueId)
      .populate('userId', 'fullName email');
    
    if (!feedback) {
      logger.warn(`Customer issue not found with ID: ${issueId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Customer issue not found'
      });
    }
    
    // Convert to object to include all properties
    const feedbackObj = feedback.toObject();
    
    // Transform to match expected format
    const transformedFeedback = {
      id: feedbackObj._id.toString(),
      userId: feedbackObj.userId ? feedbackObj.userId._id.toString() : 'unknown',
      userEmail: feedbackObj.userId ? feedbackObj.userId.email || 'N/A' : 'N/A',
      userName: feedbackObj.userId ? feedbackObj.userId.fullName || 'Anonymous User' : 'Anonymous User',
      issueType: determineFeedbackType(feedbackObj),
      description: feedbackObj.comment || 'No description provided',
      status: feedbackObj.isResolved ? 'resolved' : (feedback.hasResponse ? 'in-progress' : 'pending'),
      priority: determinePriority(feedbackObj),
      createdAt: feedbackObj.createdAt,
      updatedAt: feedbackObj.updatedAt,
      notes: feedbackObj.staffResponse && feedbackObj.staffResponse.response ? [
        {
          id: `n-${feedbackObj._id}-1`,
          content: feedbackObj.staffResponse.response,
          createdBy: 'Staff',
          createdAt: feedbackObj.staffResponse.responseDate || feedbackObj.updatedAt
        }
      ] : []
    };
    
    res.status(200).json(transformedFeedback);
  } catch (error) {
    logger.error(`Error fetching customer issue: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch customer issue',
      error: error.message
    });
  }
};

/**
 * Update a customer issue's status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateIssueStatus = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { status } = req.body;
    
    logger.info(`Updating status for issue ${issueId} to ${status}`);
    
    if (!status) {
      logger.warn('Status update failed: No status provided');
      return res.status(400).json({
        status: 'error',
        message: 'Status is required'
      });
    }
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      logger.warn(`Invalid issue ID format: ${issueId}`);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid issue ID format'
      });
    }
    
    // Using findOneAndUpdate instead of find + save to avoid validation issues
    // The validation error was happening during the save operation
    const updatedFeedback = await feedbackModel.findOneAndUpdate(
      { _id: issueId },
      { 
        isResolved: status === 'resolved',
        // Don't update the comment field to avoid validation
      },
      { 
        new: true, // Return the updated document
        runValidators: false, // Skip validation to avoid issues with comment field
      }
    ).populate('userId', 'fullName email');
    
    if (!updatedFeedback) {
      logger.warn(`Customer issue not found with ID: ${issueId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Customer issue not found'
      });
    }
    
    const oldStatus = updatedFeedback.isResolved ? 'resolved' : (updatedFeedback.hasResponse ? 'in-progress' : 'pending');
    
    logger.info(`Updated issue ${issueId} status from ${oldStatus} to ${status}`);
    
    // Convert to object to access all properties including virtuals
    const updatedFeedbackObj = updatedFeedback.toObject();
    
    const transformedFeedback = {
      id: updatedFeedbackObj._id.toString(),
      userId: updatedFeedbackObj.userId ? updatedFeedbackObj.userId._id.toString() : 'unknown',
      userEmail: updatedFeedbackObj.userId ? updatedFeedbackObj.userId.email || 'N/A' : 'N/A',
      userName: updatedFeedbackObj.userId ? updatedFeedbackObj.userId.fullName || 'Anonymous User' : 'Anonymous User',
      issueType: determineFeedbackType(updatedFeedbackObj),
      description: updatedFeedbackObj.comment || 'No description provided',
      status: updatedFeedbackObj.isResolved ? 'resolved' : (updatedFeedback.hasResponse ? 'in-progress' : 'pending'),
      priority: updatedFeedbackObj.priorityOverride || determinePriority(updatedFeedbackObj),
      createdAt: updatedFeedbackObj.createdAt,
      updatedAt: updatedFeedbackObj.updatedAt,
      notes: updatedFeedbackObj.staffResponse && updatedFeedbackObj.staffResponse.response ? [
        {
          id: `n-${updatedFeedbackObj._id}-1`,
          content: updatedFeedbackObj.staffResponse.response,
          createdBy: 'Staff',
          createdAt: updatedFeedbackObj.staffResponse.responseDate || updatedFeedbackObj.updatedAt
        }
      ] : []
    };
    
    res.status(200).json({
      status: 'success',
      message: `Issue status updated to ${status}`,
      issue: transformedFeedback
    });
  } catch (error) {
    logger.error(`Error updating issue status: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update issue status',
      error: error.message
    });
  }
};

/**
 * Update a customer issue's priority
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateIssuePriority = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { priority } = req.body;
    
    logger.info(`Updating priority for issue ${issueId} to ${priority}`);
    
    if (!priority) {
      logger.warn('Priority update failed: No priority provided');
      return res.status(400).json({
        status: 'error',
        message: 'Priority is required'
      });
    }
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      logger.warn(`Invalid issue ID format: ${issueId}`);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid issue ID format'
      });
    }
    
    // Get the current feedback first to know the old priority
    const currentFeedback = await feedbackModel.findById(issueId);
    if (!currentFeedback) {
      logger.warn(`Customer issue not found with ID: ${issueId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Customer issue not found'
      });
    }
    
    // Store old priority for logging
    const oldPriority = determinePriority(currentFeedback);
    
    // Prepare the update object based on priority
    const updateObj = { priorityOverride: priority };
    
    // Optionally update sentiment to match the priority
    if (priority === 'urgent' || priority === 'high') {
      updateObj.sentiment = 'negative';
    } else if (priority === 'medium') {
      updateObj.sentiment = 'neutral';
    } else if (priority === 'low') {
      updateObj.sentiment = 'positive';
    }
    
    // Using findOneAndUpdate to bypass validation issues
    const updatedFeedback = await feedbackModel.findOneAndUpdate(
      { _id: issueId },
      updateObj,
      { 
        new: true, // Return the updated document
        runValidators: false, // Skip validation to avoid issues with comment field
      }
    ).populate('userId', 'fullName email');
    
    if (!updatedFeedback) {
      return res.status(404).json({
        status: 'error',
        message: 'Updated feedback not found'
      });
    }
    
    logger.info(`Updated issue ${issueId} priority from ${oldPriority} to ${priority}`);
    
    // Convert to object to access all properties including virtuals
    const updatedFeedbackObj = updatedFeedback.toObject();
    
    const transformedFeedback = {
      id: updatedFeedbackObj._id.toString(),
      userId: updatedFeedbackObj.userId ? updatedFeedbackObj.userId._id.toString() : 'unknown',
      userEmail: updatedFeedbackObj.userId ? updatedFeedbackObj.userId.email || 'N/A' : 'N/A',
      userName: updatedFeedbackObj.userId ? updatedFeedbackObj.userId.fullName || 'Anonymous User' : 'Anonymous User',
      issueType: determineFeedbackType(updatedFeedbackObj),
      description: updatedFeedbackObj.comment || 'No description provided',
      status: updatedFeedbackObj.isResolved ? 'resolved' : (updatedFeedback.hasResponse ? 'in-progress' : 'pending'),
      priority: updatedFeedbackObj.priorityOverride || determinePriority(updatedFeedbackObj),
      createdAt: updatedFeedbackObj.createdAt,
      updatedAt: updatedFeedbackObj.updatedAt,
      notes: updatedFeedbackObj.staffResponse && updatedFeedbackObj.staffResponse.response ? [
        {
          id: `n-${updatedFeedbackObj._id}-1`,
          content: updatedFeedbackObj.staffResponse.response,
          createdBy: 'Staff',
          createdAt: updatedFeedbackObj.staffResponse.responseDate || updatedFeedbackObj.updatedAt
        }
      ] : []
    };
    
    res.status(200).json({
      status: 'success',
      message: `Issue priority updated from ${oldPriority} to ${priority}`,
      issue: transformedFeedback
    });
  } catch (error) {
    logger.error(`Error updating issue priority: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update issue priority',
      error: error.message
    });
  }
};

/**
 * Add a note to a customer issue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addIssueNote = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { content, note } = req.body; // Support both "content" and "note" fields
    
    // Use either content or note depending on what was provided
    const noteContent = content || note;
    
    logger.info(`Adding note to issue ${issueId}`);
    
    if (!noteContent) {
      logger.warn('Note addition failed: No content provided');
      return res.status(400).json({
        status: 'error',
        message: 'Note content is required'
      });
    }
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      logger.warn(`Invalid issue ID format: ${issueId}`);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid issue ID format'
      });
    }
    
    const feedback = await feedbackModel.findById(issueId);
    
    if (!feedback) {
      logger.warn(`Customer issue not found with ID: ${issueId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Customer issue not found'
      });
    }
    
    // Get staff name if available
    const staffName = req.user.fullName || 'Staff';
    
    // In feedbackSchema, add the staffResponse or update if exists
    const now = new Date();
    feedback.staffResponse = {
      responder: req.user.id, // Assuming user ID is available in request
      response: noteContent,
      responseDate: now,
      responderName: staffName
    };
    
    // Also update the feedback status to "in-progress" if it's currently "pending"
    if (!feedback.isResolved) {
      // The status will be automatically considered "in-progress" with staffResponse
    }
    
    try {
      await feedback.save();
    } catch (validationError) {
      logger.error(`Validation error when saving note: ${validationError.message}`);
      
      // Check if this is a validation error and provide a clearer message
      if (validationError.name === 'ValidationError') {
        return res.status(400).json({
          status: 'error',
          message: validationError.message || 'Invalid content in staff response',
          details: Object.values(validationError.errors).map(e => e.message)
        });
      }
      
      throw validationError; // Re-throw if not a validation error
    }
    
    // Create a transformed feedback object to return to frontend
    const transformedFeedback = transformToCustomerIssue(feedback);
    
    logger.info(`Added note to issue ${issueId}`);
    
    res.status(200).json(transformedFeedback);
  } catch (error) {
    logger.error(`Error adding note to issue: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add note to issue',
      error: error.message
    });
  }
};

/**
 * Helper function to determine priority based on feedback data
 * @param {Object} feedback - Feedback document
 * @returns {string} - Priority level
 */
const determinePriority = (feedback) => {
  // Handle null/undefined feedback
  if (!feedback) return 'medium';
  
  // First check if there's a manual override
  if (feedback.priorityOverride) {
    return feedback.priorityOverride;
  }
  
  // Otherwise determine from sentiment and rating
  if (feedback.sentiment === 'negative') {
    return feedback.rating <= 1 ? 'urgent' : 'high';
  } else if (feedback.sentiment === 'neutral') {
    return 'medium';
  } else {
    return 'low';
  }
};

/**
 * Helper function to determine the type of feedback
 * @param {Object} feedback - Feedback document
 * @returns {string} - Feedback type
 */
const determineFeedbackType = (feedback) => {
  if (!feedback) return 'General Feedback';
  
  // Check if it's related to an order
  if (feedback.orderId) {
    return 'Order Feedback';
  }
  
  // Check if it's related to a booking
  if (feedback.bookingId) {
    return 'Booking Feedback';
  }
  
  // Check sentiment to categorize general feedback
  if (feedback.sentiment === 'negative') {
    return feedback.rating <= 1 ? 'Complaint' : 'Issue Report';
  } else if (feedback.sentiment === 'positive') {
    return 'Positive Feedback';
  }
  
  // Default type
  return 'General Feedback';
};

// Export getter for tests only
export const getCustomerIssuesData = async () => {
  return await feedbackModel.find().populate('userId', 'fullName email').lean();
};

// Helper function to transform feedback data to the customer issue format
const transformToCustomerIssue = (feedback) => {
  if (!feedback) {
    console.warn('Received null or undefined feedback item');
    return null;
  }
  
  try {
    // Safely extract user information with null checks
    const user = feedback.userId || {};
    
    // Build notes array from staff response
    const notes = [];
    if (feedback.staffResponse && feedback.staffResponse.response) {
      notes.push({
        id: `note-${feedback._id}-1`,
        content: feedback.staffResponse.response,
        createdBy: feedback.staffResponse.responderName || 'Staff Member',
        createdAt: feedback.staffResponse.responseDate || feedback.updatedAt || new Date()
      });
    }
    
    // Return flattened structure matching frontend expectations
    return {
      id: feedback._id?.toString() || `temp-${Date.now()}`,
      userId: user._id?.toString() || 'unknown',
      userEmail: user.email || 'No email provided',
      userName: user.fullName || 'Anonymous Customer',
      issueType: determineFeedbackType(feedback),
      description: feedback.comment || 'No description provided',
      status: feedback.isResolved ? 'resolved' : (notes.length > 0 ? 'in-progress' : 'pending'),
      priority: feedback.priorityOverride || determinePriority(feedback),
      createdAt: feedback.createdAt || new Date(),
      updatedAt: feedback.updatedAt || feedback.createdAt || new Date(),
      notes: notes
    };
  } catch (error) {
    console.error('Error transforming feedback to customer issue:', error);
    console.error('Problematic feedback item:', JSON.stringify(feedback, null, 2));
    
    // Return a fallback object in case of error
    return {
      id: feedback._id?.toString() || `error-${Date.now()}`,
      userId: 'error',
      userEmail: 'error@example.com',
      userName: 'Error Processing Customer',
      issueType: 'Error',
      description: 'There was an error processing this feedback item',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: []
    };
  }
}; 