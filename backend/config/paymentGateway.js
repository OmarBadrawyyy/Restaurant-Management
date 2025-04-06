import dotenv from 'dotenv';
import logger from './logger.js';
import Stripe from 'stripe';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Payment error types for better categorization
export const PaymentErrorTypes = {
  VALIDATION: 'validation_error',
  GATEWAY: 'gateway_error',
  AUTHENTICATION: 'authentication_error',
  AUTHORIZATION: 'authorization_error',
  RATE_LIMIT: 'rate_limit_error',
  SERVER: 'server_error',
  NETWORK: 'network_error',
  IDEMPOTENCY: 'idempotency_error'
};

// Initialize payment gateways
const stripeTest = process.env.STRIPE_TEST_SECRET_KEY
  ? new Stripe(process.env.STRIPE_TEST_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

const stripeProd = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) 
  : null;

// Helper function to get appropriate Stripe instance based on test mode
const getStripe = (testMode = false) => {
  if (testMode) {
    if (!stripeTest) {
      throw createPaymentError(
        PaymentErrorTypes.GATEWAY,
        'Stripe test mode is not configured. Please set STRIPE_TEST_SECRET_KEY in .env'
      );
    }
    return stripeTest;
  }
  
  if (!stripeProd) {
    throw createPaymentError(
      PaymentErrorTypes.GATEWAY,
      'Stripe is not configured. Please set STRIPE_SECRET_KEY in .env'
    );
  }
  return stripeProd;
};

// Payment gateway configuration
const paymentConfig = {
  defaultGateway: process.env.DEFAULT_PAYMENT_GATEWAY || 'stripe',
  supportedGateways: ['stripe', 'paypal', 'square'],
  testMode: process.env.PAYMENT_TEST_MODE === 'true',
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  testWebhookSecret: process.env.PAYMENT_TEST_WEBHOOK_SECRET,
  successUrl: process.env.PAYMENT_SUCCESS_URL || 'http://localhost:3000/payment/success',
  cancelUrl: process.env.PAYMENT_CANCEL_URL || 'http://localhost:3000/payment/cancel',
  idempotencyKeyTTL: parseInt(process.env.IDEMPOTENCY_KEY_TTL || '86400', 10), // 24 hours in seconds
  gatewayTimeoutMs: parseInt(process.env.GATEWAY_TIMEOUT_MS || '30000', 10), // 30 seconds
};

// Helper function to create standardized payment errors
export const createPaymentError = (type, message, originalError = null) => {
  const error = new Error(message);
  error.type = type;
  error.originalError = originalError;
  return error;
};

/**
 * Create a payment intent with Stripe
 * @param {Object} paymentData - Payment data including amount, currency, etc.
 * @param {String} [idempotencyKey] - Optional idempotency key for safe retries
 * @param {Boolean} [testMode] - Whether to use test mode
 * @returns {Promise<Object>} - Payment intent object
 */
export const createStripePaymentIntent = async (paymentData, idempotencyKey, testMode) => {
  try {
    const useTestMode = testMode !== undefined ? testMode : paymentConfig.testMode;
    const stripe = getStripe(useTestMode);
    
    const { amount, currency = 'usd', description, metadata = {}, customerId } = paymentData;

    if (!amount || amount <= 0) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'Amount is required and must be greater than 0'
      );
    }

    const paymentIntentParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description,
      metadata: {
        ...metadata,
        testMode: useTestMode ? 'true' : 'false'
      },
      customer: customerId || undefined,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Set idempotency key if provided
    const options = idempotencyKey 
      ? { idempotencyKey } 
      : {};

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentParams,
      options
    );

    logger.info(`Stripe payment intent created: ${paymentIntent.id} (testMode: ${useTestMode})`);
    return paymentIntent;
  } catch (error) {
    if (error.type && Object.values(PaymentErrorTypes).includes(error.type)) {
      // Already formatted error, just pass it through
      throw error;
    }
    
    let errorType = PaymentErrorTypes.GATEWAY;
    
    if (error.code === 'card_declined' || error.decline_code) {
      errorType = PaymentErrorTypes.AUTHORIZATION;
    } else if (error.code === 'rate_limit_exceeded') {
      errorType = PaymentErrorTypes.RATE_LIMIT;
    } else if (error.code === 'authentication_required') {
      errorType = PaymentErrorTypes.AUTHENTICATION;
    } else if (error.code === 'idempotency_key_reused') {
      errorType = PaymentErrorTypes.IDEMPOTENCY;
    } else if (error.type === 'invalid_request_error') {
      errorType = PaymentErrorTypes.VALIDATION;
    }
    
    logger.error(`Error creating Stripe payment intent: ${error.message}`, { 
      error,
      stack: error.stack 
    });
    
    throw createPaymentError(
      errorType,
      `Payment processing failed: ${error.message}`,
      error
    );
  }
};

/**
 * Create a PayPal order
 * @param {Object} paymentData - Payment data including amount, currency, etc.
 * @param {String} [idempotencyKey] - Optional idempotency key for safe retries
 * @param {Boolean} [testMode] - Whether to use test mode
 * @returns {Promise<Object>} - PayPal order object
 */
export const createPayPalOrder = async (paymentData, idempotencyKey, testMode) => {
  try {
    const useTestMode = testMode !== undefined ? testMode : paymentConfig.testMode;
    const { amount, currency = 'USD', description, items = [] } = paymentData;

    if (!amount || amount <= 0) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        'Amount is required and must be greater than 0'
      );
    }

    // PayPal API credentials - use test credentials if in test mode
    const clientId = useTestMode 
      ? process.env.PAYPAL_TEST_CLIENT_ID 
      : process.env.PAYPAL_CLIENT_ID;
      
    const clientSecret = useTestMode 
      ? process.env.PAYPAL_TEST_CLIENT_SECRET 
      : process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw createPaymentError(
        PaymentErrorTypes.GATEWAY,
        `PayPal is not configured. Please set ${useTestMode ? 'PAYPAL_TEST_CLIENT_ID and PAYPAL_TEST_CLIENT_SECRET' : 'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET'} in .env`
      );
    }

    // Get access token
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const baseUrl = useTestMode 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com';
      
    const tokenResponse = await axios.post(
      `${baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
          'PayPal-Request-Id': idempotencyKey || undefined
        },
        timeout: paymentConfig.gatewayTimeoutMs
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Create order
    const orderResponse = await axios.post(
      `${baseUrl}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: currency,
                  value: amount.toFixed(2),
                },
              },
            },
            description,
            items: items.map(item => ({
              name: item.name,
              quantity: item.quantity.toString(),
              unit_amount: {
                currency_code: currency,
                value: (item.price).toFixed(2),
              },
            })),
          },
        ],
        application_context: {
          return_url: paymentConfig.successUrl,
          cancel_url: paymentConfig.cancelUrl,
          shipping_preference: 'NO_SHIPPING'
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'PayPal-Request-Id': idempotencyKey || undefined
        },
        timeout: paymentConfig.gatewayTimeoutMs
      }
    );

    logger.info(`PayPal order created: ${orderResponse.data.id} (testMode: ${useTestMode})`);
    return {
      ...orderResponse.data,
      testMode: useTestMode
    };
  } catch (error) {
    if (error.type && Object.values(PaymentErrorTypes).includes(error.type)) {
      // Already formatted error, just pass it through
      throw error;
    }
    
    let errorType = PaymentErrorTypes.GATEWAY;
    let errorMessage = 'Payment processing failed';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const responseData = error.response.data;
      errorMessage = responseData.message || responseData.error_description || 'Payment processing failed';
      
      if (error.response.status === 400) {
        errorType = PaymentErrorTypes.VALIDATION;
      } else if (error.response.status === 401 || error.response.status === 403) {
        errorType = PaymentErrorTypes.AUTHENTICATION;
      } else if (error.response.status === 422) {
        errorType = PaymentErrorTypes.VALIDATION;
      } else if (error.response.status === 429) {
        errorType = PaymentErrorTypes.RATE_LIMIT;
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorType = PaymentErrorTypes.NETWORK;
      errorMessage = 'No response received from payment provider';
    }
    
    logger.error(`Error creating PayPal order: ${errorMessage}`, { 
      error,
      stack: error.stack 
    });
    
    throw createPaymentError(
      errorType,
      `Payment processing failed: ${errorMessage}`,
      error
    );
  }
};

/**
 * Process a payment using the specified gateway
 * @param {string} gateway - Payment gateway to use
 * @param {Object} paymentData - Payment data
 * @param {String} [idempotencyKey] - Optional idempotency key for safe retries
 * @param {Boolean} [testMode] - Whether to use test mode
 * @returns {Promise<Object>} - Payment result
 */
export const processPayment = async (gateway, paymentData, idempotencyKey, testMode) => {
  try {
    const useTestMode = testMode !== undefined ? testMode : paymentConfig.testMode;
    const selectedGateway = gateway || paymentConfig.defaultGateway;

    if (!paymentConfig.supportedGateways.includes(selectedGateway)) {
      throw createPaymentError(
        PaymentErrorTypes.VALIDATION,
        `Unsupported payment gateway: ${selectedGateway}. Supported gateways are: ${paymentConfig.supportedGateways.join(', ')}`
      );
    }

    switch (selectedGateway) {
      case 'stripe':
        return await createStripePaymentIntent(paymentData, idempotencyKey, useTestMode);
      case 'paypal':
        return await createPayPalOrder(paymentData, idempotencyKey, useTestMode);
      case 'square':
        // Implement Square payment processing
        throw createPaymentError(
          PaymentErrorTypes.GATEWAY,
          'Square payment processing not implemented yet'
        );
      default:
        throw createPaymentError(
          PaymentErrorTypes.VALIDATION,
          `Unsupported payment gateway: ${selectedGateway}`
        );
    }
  } catch (error) {
    if (error.type && Object.values(PaymentErrorTypes).includes(error.type)) {
      // Already formatted error, just pass it through
      throw error;
    }
    
    logger.error(`Payment processing error: ${error.message}`, { 
      gateway,
      error, 
      stack: error.stack 
    });
    
    throw createPaymentError(
      PaymentErrorTypes.GATEWAY,
      `Payment processing failed: ${error.message}`,
      error
    );
  }
};

/**
 * Verify a webhook signature from Stripe
 * @param {string} signature - Webhook signature
 * @param {string} payload - Webhook payload
 * @param {Boolean} [testMode] - Whether to use test mode
 * @returns {Object|null} - Verified event or null if verification fails
 */
export const verifyStripeWebhook = (signature, payload, testMode) => {
  try {
    const useTestMode = testMode !== undefined ? testMode : paymentConfig.testMode;
    const stripe = getStripe(useTestMode);
    
    const webhookSecret = useTestMode 
      ? paymentConfig.testWebhookSecret 
      : paymentConfig.webhookSecret;
      
    if (!webhookSecret) {
      throw createPaymentError(
        PaymentErrorTypes.GATEWAY,
        `Stripe webhook verification not configured. Please set ${useTestMode ? 'PAYMENT_TEST_WEBHOOK_SECRET' : 'PAYMENT_WEBHOOK_SECRET'} in .env`
      );
    }

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    logger.info(`Stripe webhook verified: ${event.id} (testMode: ${useTestMode})`);
    return event;
  } catch (error) {
    if (error.type && Object.values(PaymentErrorTypes).includes(error.type)) {
      // Already formatted error, just pass it through
      throw error;
    }
    
    logger.error(`Webhook signature verification failed: ${error.message}`, {
      error,
      stack: error.stack
    });
    
    throw createPaymentError(
      PaymentErrorTypes.AUTHENTICATION,
      `Webhook signature verification failed: ${error.message}`,
      error
    );
  }
};

export default {
  processPayment,
  createStripePaymentIntent,
  createPayPalOrder,
  verifyStripeWebhook,
  config: paymentConfig,
  errorTypes: PaymentErrorTypes,
  createPaymentError
};