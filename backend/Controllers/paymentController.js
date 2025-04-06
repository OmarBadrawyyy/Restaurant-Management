import crypto from 'crypto';
import paymentGateway, { PaymentErrorTypes, createPaymentError } from '../config/paymentGateway.js';
import { orderModel } from '../schemas/orderSchema.js';
import { userModel } from '../schemas/userSchema.js';
import { paymentModel } from '../schemas/paymentSchema.js';
import logger from '../config/logger.js';

// In-memory store for idempotency keys (simplistic implementation)
const idempotencyStore = new Map();

// Helper function to generate idempotency key
const generateIdempotencyKey = (userId, orderId) => {
  const timestamp = Date.now().toString();
  const data = `${userId}-${orderId}-${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Helper function to check if idempotency key has been used
const checkIdempotencyKey = async (key) => {
  return idempotencyStore.get(`idempotency:${key}`);
};

// Helper function to save idempotency key
const saveIdempotencyKey = async (key, resultId, ttlSeconds = 86400) => {
  idempotencyStore.set(`idempotency:${key}`, resultId);
  
  // Set up automatic cleanup after TTL
  setTimeout(() => {
    idempotencyStore.delete(`idempotency:${key}`);
  }, ttlSeconds * 1000);
};

/**
 * Format error response based on error type
 * @param {Error} error - The error object
 * @returns {Object} - Formatted error response
 */
const formatErrorResponse = (error) => {
  // Default to server error
  let statusCode = 500;
  let errorType = PaymentErrorTypes.SERVER;
  let message = 'An unexpected error occurred';
  
  // If it's one of our custom payment errors
  if (error.type && Object.values(PaymentErrorTypes).includes(error.type)) {
    errorType = error.type;
    message = error.message;
    
    switch (error.type) {
      case PaymentErrorTypes.VALIDATION:
        statusCode = 400;
        break;
      case PaymentErrorTypes.AUTHENTICATION:
        statusCode = 401;
        break;
      case PaymentErrorTypes.AUTHORIZATION:
        statusCode = 403;
        break;
      case PaymentErrorTypes.IDEMPOTENCY:
        statusCode = 409;
        break;
      case PaymentErrorTypes.RATE_LIMIT:
        statusCode = 429;
        break;
      default:
        statusCode = 500;
    }
  } else {
    // For general errors
    message = error.message || 'An unexpected error occurred';
  }
  
  return {
    statusCode,
    response: {
      status: 'error',
      type: errorType,
      message,
      ...(process.env.NODE_ENV !== 'production' && {
        details: error.originalError ? error.originalError.message : error.stack
      })
    }
  };
};

/**
 * Create a payment intent/session for an order
 * @route POST /api/payments/create-payment
 */
export const createPayment = async (req, res) => {
  try {
    const { orderId, gateway, paymentMethod, idempotencyKey: clientIdempotencyKey } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!orderId) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'Order ID is required'
      );
    }

    // Use provided idempotency key or generate one
    const idempotencyKey = clientIdempotencyKey || generateIdempotencyKey(userId.toString(), orderId);
    
    // Check if this request has already been processed
    const existingResult = await checkIdempotencyKey(idempotencyKey);
    if (existingResult) {
      // Return the existing payment intent ID
      const existingOrder = await orderModel.findById(orderId);
      if (existingOrder && existingOrder.paymentDetails) {
        return res.status(200).json({
          message: 'Payment already initiated',
          paymentDetails: existingOrder.paymentDetails,
          idempotencyKey
        });
      }
    }

    // Find the order
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'Order not found'
      );
    }

    // Check if order belongs to the user
    if (order.user.toString() !== userId.toString()) {
      throw createPaymentError(
        PaymentErrorTypes.AUTHORIZATION,
        'Not authorized to pay for this order'
      );
    }

    // Check if order is already paid
    if (order.isPaid) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'Order is already paid'
      );
    }

    // Get user for customer information
    const user = await userModel.findById(userId);
    if (!user) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'User not found'
      );
    }

    // Prepare payment data
    const paymentData = {
      amount: order.totalPrice,
      currency: 'usd', // Default currency
      description: `Payment for Order #${order._id.toString().slice(-6)}`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        idempotencyKey
      },
      customerId: user.stripeCustomerId, // If user has a Stripe customer ID
      items: order.items.map(item => ({
        name: item.name || `Item #${item.item}`,
        quantity: item.quantity,
        price: item.price
      }))
    };

    // Process payment with selected gateway
    const paymentResult = await paymentGateway.processPayment(
      gateway, 
      paymentData, 
      idempotencyKey
    );

    // Update order with payment intent/session ID
    if (gateway === 'stripe' || paymentResult.id.startsWith('pi_')) {
      order.paymentDetails = {
        provider: 'stripe',
        paymentIntentId: paymentResult.id,
        clientSecret: paymentResult.client_secret,
        status: paymentResult.status,
        idempotencyKey
      };
    } else if (gateway === 'paypal' || paymentResult.id.includes('PAY-')) {
      order.paymentDetails = {
        provider: 'paypal',
        paypalOrderId: paymentResult.id,
        status: paymentResult.status,
        approvalUrl: paymentResult.links.find(link => link.rel === 'approve').href,
        idempotencyKey
      };
    }

    order.paymentMethod = paymentMethod || gateway;
    await order.save();

    // Save the idempotency key with result
    await saveIdempotencyKey(
      idempotencyKey, 
      paymentResult.id, 
      paymentGateway.config.idempotencyKeyTTL
    );

    res.status(200).json({
      status: 'success',
      message: 'Payment initiated successfully',
      paymentDetails: order.paymentDetails,
      idempotencyKey
    });
  } catch (error) {
    logger.error(`Error creating payment: ${error.message}`, {
      userId: req.user?._id,
      orderId: req.body?.orderId,
      error
    });
    
    const { statusCode, response } = formatErrorResponse(error);
    res.status(statusCode).json(response);
  }
};

/**
 * Confirm a payment (for client-side confirmation)
 * @route POST /api/payments/confirm-payment
 */
export const confirmPayment = async (req, res) => {
  try {
    const { orderId, paymentIntentId, idempotencyKey: clientIdempotencyKey } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!orderId || !paymentIntentId) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'Order ID and payment intent ID are required'
      );
    }

    // Use provided idempotency key or generate one
    const idempotencyKey = clientIdempotencyKey || 
                          generateIdempotencyKey(`confirm-${userId.toString()}-${orderId}`);
    
    // Check if this request has already been processed
    const existingResult = await checkIdempotencyKey(idempotencyKey);
    if (existingResult) {
      // If the order is already confirmed, return success
      const existingOrder = await orderModel.findById(orderId);
      if (existingOrder && existingOrder.isPaid && existingOrder.paymentDetails?.status === 'succeeded') {
        return res.status(200).json({
          status: 'success',
          message: 'Payment already confirmed',
          order: {
            id: existingOrder._id,
            status: existingOrder.status,
            isPaid: existingOrder.isPaid,
            paidAt: existingOrder.paidAt
          }
        });
      }
    }

    // Find the order
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'Order not found'
      );
    }

    // Check if order belongs to the user
    if (order.user.toString() !== userId.toString()) {
      throw createPaymentError(
        PaymentErrorTypes.AUTHORIZATION,
        'Not authorized to confirm payment for this order'
      );
    }

    // Verify payment intent matches
    if (!order.paymentDetails || order.paymentDetails.paymentIntentId !== paymentIntentId) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'Payment intent does not match order'
      );
    }

    // For Stripe, retrieve the payment intent to check status
    if (order.paymentDetails.provider === 'stripe') {
      const stripe = await import('stripe').then(Stripe => new Stripe(
        process.env.PAYMENT_TEST_MODE === 'true' 
          ? process.env.STRIPE_TEST_SECRET_KEY 
          : process.env.STRIPE_SECRET_KEY
      ));
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Update order payment status
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentDetails.status = 'succeeded';
        order.paymentResult = {
          id: paymentIntent.id,
          status: paymentIntent.status,
          update_time: new Date(),
          email_address: req.user.email
        };

        await order.save();
        
        // Create payment record
        await createPaymentRecord(order, paymentIntent);

        // Save the idempotency key with result
        await saveIdempotencyKey(
          idempotencyKey, 
          paymentIntent.id, 
          paymentGateway.config.idempotencyKeyTTL
        );

        // Send notification to user
        await notificationModel.sendNotification({
          recipient: userId,
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Your payment for order #${order._id.toString().slice(-6)} was successful.`,
          priority: 'high',
          relatedOrder: order._id,
          actionUrl: `/orders/${order._id}`,
          actionText: 'View Order',
          sentVia: ['app', 'email']
        });

        return res.status(200).json({
          status: 'success',
          message: 'Payment confirmed successfully',
          order: {
            id: order._id,
            status: order.status,
            isPaid: order.isPaid,
            paidAt: order.paidAt
          }
        });
      } else {
        // Payment not succeeded
        order.paymentDetails.status = paymentIntent.status;
        await order.save();

        return res.status(400).json({
          status: 'error',
          type: PaymentErrorTypes.VALIDATION,
          message: 'Payment not completed',
          paymentStatus: paymentIntent.status
        });
      }
    }

    // For other payment providers, implement similar logic
    throw createPaymentError(
      PaymentErrorTypes.VALIDATION,
      'Payment confirmation not implemented for this provider'
    );
  } catch (error) {
    logger.error(`Error confirming payment: ${error.message}`, {
      userId: req.user?._id,
      orderId: req.body?.orderId,
      paymentIntentId: req.body?.paymentIntentId,
      error
    });
    
    const { statusCode, response } = formatErrorResponse(error);
    res.status(statusCode).json(response);
  }
};

/**
 * Handle payment webhook events from payment providers
 * @route POST /api/payments/webhook
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    
    // For Stripe webhooks
    if (signature) {
      const event = paymentGateway.verifyStripeWebhook(signature, req.body);

      if (!event) {
        return res.status(400).json({ 
          status: 'error',
          message: 'Invalid webhook signature' 
        });
      }

      // Process the event asynchronously to respond quickly to Stripe
      (async () => {
        try {
          // Handle different event types
          switch (event.type) {
            case 'payment_intent.succeeded':
              await handleSuccessfulPayment(event.data.object);
              break;
            case 'payment_intent.payment_failed':
              await handleFailedPayment(event.data.object);
              break;
            // Add more event types as needed
            case 'payment_intent.created':
            case 'payment_intent.canceled':
            case 'charge.succeeded':
            case 'charge.failed':
            case 'charge.refunded':
              // Log these events but don't necessarily take action
              logger.info(`Received Stripe event: ${event.type}`, {
                eventId: event.id,
                paymentIntentId: event.data.object.id
              });
              break;
            default:
              logger.info(`Unhandled Stripe event type: ${event.type}`);
          }
        } catch (error) {
          logger.error(`Error processing webhook event: ${error.message}`, {
            eventId: event.id,
            eventType: event.type,
            error
          });
        }
      })();

      // Return a 200 response immediately
      return res.status(200).json({ received: true });
    }

    // For PayPal webhooks
    if (req.body.event_type) {
      // Process the event asynchronously
      (async () => {
        try {
          // Implement PayPal webhook handling
          // Verify webhook signature, etc.
          logger.info(`Received PayPal event: ${req.body.event_type}`);
        } catch (error) {
          logger.error(`Error processing PayPal webhook: ${error.message}`, {
            eventType: req.body.event_type,
            error
          });
        }
      })();
      
      return res.status(200).json({ received: true });
    }

    res.status(400).json({ 
      status: 'error',
      message: 'Unsupported webhook provider' 
    });
  } catch (error) {
    logger.error(`Error handling payment webhook: ${error.message}`, { error });
    
    const { statusCode, response } = formatErrorResponse(error);
    res.status(statusCode).json(response);
  }
};

/**
 * Get payment methods for the authenticated user
 * @route GET /api/payments/methods
 */
export const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user
    const user = await userModel.findById(userId);
    if (!user) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'User not found'
      );
    }

    // If user has a Stripe customer ID, fetch saved payment methods
    if (user.stripeCustomerId) {
      const stripe = await import('stripe').then(Stripe => new Stripe(
        process.env.PAYMENT_TEST_MODE === 'true' 
          ? process.env.STRIPE_TEST_SECRET_KEY 
          : process.env.STRIPE_SECRET_KEY
      ));
      
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card'
      });

      return res.json({
        status: 'success',
        paymentMethods: paymentMethods.data.map(method => ({
          id: method.id,
          type: method.type,
          brand: method.card.brand,
          last4: method.card.last4,
          expMonth: method.card.exp_month,
          expYear: method.card.exp_year,
          isDefault: method.id === user.defaultPaymentMethod
        }))
      });
    }

    // If no Stripe customer ID, return empty array
    res.json({ 
      status: 'success',
      paymentMethods: [] 
    });
  } catch (error) {
    logger.error(`Error fetching payment methods: ${error.message}`, {
      userId: req.user?._id,
      error
    });
    
    const { statusCode, response } = formatErrorResponse(error);
    res.status(statusCode).json(response);
  }
};

/**
 * Add a new payment method for the authenticated user
 * @route POST /api/payments/methods
 */
export const addPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user._id;

    if (!paymentMethodId) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'Payment method ID is required'
      );
    }

    // Get user
    const user = await userModel.findById(userId);
    if (!user) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'User not found'
      );
    }

    const stripe = await import('stripe').then(Stripe => new Stripe(
      process.env.PAYMENT_TEST_MODE === 'true' 
        ? process.env.STRIPE_TEST_SECRET_KEY 
        : process.env.STRIPE_SECRET_KEY
    ));

    // If user doesn't have a Stripe customer ID, create one
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString()
        }
      });

      user.stripeCustomerId = customer.id;
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId
    });

    // If this is the first payment method, set as default
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card'
    });

    if (paymentMethods.data.length === 1) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      user.defaultPaymentMethod = paymentMethodId;
    }

    await user.save();

    res.status(201).json({
      status: 'success',
      message: 'Payment method added successfully',
      isDefault: user.defaultPaymentMethod === paymentMethodId
    });
  } catch (error) {
    logger.error(`Error adding payment method: ${error.message}`, {
      userId: req.user?._id,
      paymentMethodId: req.body?.paymentMethodId,
      error
    });
    
    const { statusCode, response } = formatErrorResponse(error);
    res.status(statusCode).json(response);
  }
};

/**
 * Set a payment method as default for the authenticated user
 * @route PUT /api/payments/methods/:id/default
 */
export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Get user
    const user = await userModel.findById(userId);
    if (!user) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'User not found'
      );
    }

    if (!user.stripeCustomerId) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'No payment methods found for user'
      );
    }

    const stripe = await import('stripe').then(Stripe => new Stripe(
      process.env.PAYMENT_TEST_MODE === 'true' 
        ? process.env.STRIPE_TEST_SECRET_KEY 
        : process.env.STRIPE_SECRET_KEY
    ));

    // Update customer's default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: id
      }
    });

    // Update user's default payment method
    user.defaultPaymentMethod = id;
    await user.save();

    res.json({ 
      status: 'success',
      message: 'Default payment method updated successfully' 
    });
  } catch (error) {
    logger.error(`Error setting default payment method: ${error.message}`, {
      userId: req.user?._id,
      paymentMethodId: req.params.id,
      error
    });
    
    const { statusCode, response } = formatErrorResponse(error);
    res.status(statusCode).json(response);
  }
};

/**
 * Delete a payment method for the authenticated user
 * @route DELETE /api/payments/methods/:id
 */
export const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Get user
    const user = await userModel.findById(userId);
    if (!user) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'User not found'
      );
    }

    if (!user.stripeCustomerId) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'No payment methods found for user'
      );
    }

    const stripe = await import('stripe').then(Stripe => new Stripe(
      process.env.PAYMENT_TEST_MODE === 'true' 
        ? process.env.STRIPE_TEST_SECRET_KEY 
        : process.env.STRIPE_SECRET_KEY
    ));

    // Detach payment method from customer
    await stripe.paymentMethods.detach(id);

    // If this was the default payment method, update user
    if (user.defaultPaymentMethod === id) {
      user.defaultPaymentMethod = undefined;
      
      // Find another payment method to set as default
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card'
      });

      if (paymentMethods.data.length > 0) {
        const newDefault = paymentMethods.data[0].id;
        
        await stripe.customers.update(user.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: newDefault
          }
        });

        user.defaultPaymentMethod = newDefault;
      }
    }

    await user.save();

    res.json({ 
      status: 'success',
      message: 'Payment method deleted successfully' 
    });
  } catch (error) {
    logger.error(`Error deleting payment method: ${error.message}`, {
      userId: req.user?._id,
      paymentMethodId: req.params.id,
      error
    });
    
    const { statusCode, response } = formatErrorResponse(error);
    res.status(statusCode).json(response);
  }
};

/**
 * Get payment history for the authenticated user
 * @route GET /api/payments/history
 */
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    // Find paid orders for the user
    const payments = await orderModel.find({
      user: userId,
      isPaid: true
    })
    .sort({ paidAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .select('_id totalPrice paidAt paymentMethod paymentResult items.name');

    // Get total count
    const totalCount = await orderModel.countDocuments({
      user: userId,
      isPaid: true
    });

    res.json({
      status: 'success',
      payments,
      pagination: {
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Error fetching payment history: ${error.message}`, {
      userId: req.user?._id,
      error
    });
    
    const { statusCode, response } = formatErrorResponse(error);
    res.status(statusCode).json(response);
  }
};

/**
 * Create a payment record in the database
 * @param {Object} order - Order object
 * @param {Object} paymentInfo - Payment information from gateway
 */
async function createPaymentRecord(order, paymentInfo) {
  try {
    const payment = new paymentModel({
      order: order._id,
      user: order.user,
      amount: order.totalPrice,
      currency: 'USD',
      paymentMethod: order.paymentMethod,
      status: 'completed',
      transactionId: paymentInfo.id,
      metadata: paymentInfo
    });

    // Set payment method details if available
    if (paymentInfo.charges && paymentInfo.charges.data && paymentInfo.charges.data.length > 0) {
      const charge = paymentInfo.charges.data[0];
      if (charge.payment_method_details && charge.payment_method_details.card) {
        const card = charge.payment_method_details.card;
        payment.paymentMethodDetails = {
          cardType: card.brand,
          lastFour: card.last4,
          expiryMonth: card.exp_month.toString().padStart(2, '0'),
          expiryYear: card.exp_year.toString()
        };
      }
      if (charge.receipt_url) {
        payment.receiptUrl = charge.receipt_url;
      }
    }

    await payment.save();
    logger.info(`Payment record created for order: ${order._id}`);
    return payment;
  } catch (error) {
    logger.error(`Error creating payment record: ${error.message}`, { 
      orderId: order._id,
      error 
    });
    // Don't throw - this is a background operation
  }
}

// Helper functions for webhook handling
async function handleSuccessfulPayment(paymentIntent) {
  try {
    // Find order by payment intent ID
    const order = await orderModel.findOne({
      'paymentDetails.paymentIntentId': paymentIntent.id
    });

    if (!order) {
      logger.warn(`Order not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    // Skip if already processed
    if (order.isPaid && order.paymentDetails.status === 'succeeded') {
      logger.info(`Payment already processed for order: ${order._id}`);
      return;
    }

    // Update order payment status
    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentDetails.status = 'succeeded';
    order.paymentResult = {
      id: paymentIntent.id,
      status: paymentIntent.status,
      update_time: new Date(),
      email_address: paymentIntent.receipt_email
    };

    await order.save();
    
    // Create payment record
    await createPaymentRecord(order, paymentIntent);

    // Send notification to user
    await notificationModel.sendNotification({
      recipient: order.user,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Your payment for order #${order._id.toString().slice(-6)} was successful.`,
      priority: 'high',
      relatedOrder: order._id,
      actionUrl: `/orders/${order._id}`,
      actionText: 'View Order',
      sentVia: ['app', 'email']
    });

    logger.info(`Payment succeeded for order: ${order._id}`);
  } catch (error) {
    logger.error(`Error handling successful payment: ${error.message}`, {
      paymentIntentId: paymentIntent.id,
      error
    });
  }
}

async function handleFailedPayment(paymentIntent) {
  try {
    // Find order by payment intent ID
    const order = await orderModel.findOne({
      'paymentDetails.paymentIntentId': paymentIntent.id
    });

    if (!order) {
      logger.warn(`Order not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    // Update order payment status
    order.paymentDetails.status = 'failed';
    order.paymentResult = {
      id: paymentIntent.id,
      status: paymentIntent.status,
      update_time: new Date(),
      error: paymentIntent.last_payment_error?.message || 'Payment failed'
    };

    await order.save();

    // Send notification to user
    await notificationModel.sendNotification({
      recipient: order.user,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Your payment for order #${order._id.toString().slice(-6)} failed. Please try again.`,
      priority: 'high',
      relatedOrder: order._id,
      actionUrl: `/orders/${order._id}/payment`,
      actionText: 'Try Again',
      sentVia: ['app', 'email']
    });

    logger.info(`Payment failed for order: ${order._id}`);
  } catch (error) {
    logger.error(`Error handling failed payment: ${error.message}`, {
      paymentIntentId: paymentIntent.id,
      error
    });
  }
}

/**
 * Reconcile payments between Stripe and database
 * This function would be called by a scheduled job
 */
export const reconcilePayments = async (startDate, endDate) => {
  try {
    logger.info(`Starting payment reconciliation for period: ${startDate} to ${endDate}`);
    
    // Get all Stripe payment intents in the date range
    const stripe = await import('stripe').then(Stripe => new Stripe(
      process.env.PAYMENT_TEST_MODE === 'true' 
        ? process.env.STRIPE_TEST_SECRET_KEY 
        : process.env.STRIPE_SECRET_KEY
    ));
    
    // Convert dates to timestamps for Stripe API
    const created = {
      gte: Math.floor(new Date(startDate).getTime() / 1000),
      lte: Math.floor(new Date(endDate).getTime() / 1000)
    };
    
    let hasMore = true;
    let startingAfter = null;
    const pageSize = 100;
    const allPaymentIntents = [];
    
    // Paginate through all payment intents
    while (hasMore) {
      const params = { 
        limit: pageSize,
        created,
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const paymentIntents = await stripe.paymentIntents.list(params);
      
      allPaymentIntents.push(...paymentIntents.data);
      
      if (paymentIntents.has_more && paymentIntents.data.length > 0) {
        startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }
    
    logger.info(`Found ${allPaymentIntents.length} Stripe payment intents to reconcile`);
    
    // Check each payment intent against our database
    for (const paymentIntent of allPaymentIntents) {
      if (paymentIntent.status === 'succeeded') {
        // Look for order with this payment intent
        const order = await orderModel.findOne({
          'paymentDetails.paymentIntentId': paymentIntent.id
        });
        
        if (!order) {
          logger.warn(`Reconciliation: Order not found for payment intent: ${paymentIntent.id}`);
          continue;
        }
        
        // Check if order is marked as paid
        if (!order.isPaid) {
          logger.warn(`Reconciliation: Order ${order._id} has successful payment intent ${paymentIntent.id} but is not marked as paid`);
          
          // Update order
          order.isPaid = true;
          order.paidAt = new Date(paymentIntent.created * 1000);
          order.paymentDetails.status = 'succeeded';
          order.paymentResult = {
            id: paymentIntent.id,
            status: paymentIntent.status,
            update_time: new Date(),
            email_address: paymentIntent.receipt_email || ''
          };
          
          await order.save();
          logger.info(`Reconciliation: Updated order ${order._id} to paid status`);
          
          // Create payment record if it doesn't exist
          const existingPayment = await paymentModel.findOne({
            transactionId: paymentIntent.id
          });
          
          if (!existingPayment) {
            await createPaymentRecord(order, paymentIntent);
          }
        }
      }
    }
    
    logger.info(`Payment reconciliation completed successfully`);
    return { success: true, processed: allPaymentIntents.length };
  } catch (error) {
    logger.error(`Error in payment reconciliation: ${error.message}`, { error });
    return { success: false, error: error.message };
  }
}; 