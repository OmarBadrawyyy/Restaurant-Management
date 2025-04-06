import mongoose from 'mongoose';
import logger from './logger.js';

// MongoDB Connection Manager specifically optimized for Windows environments
const connectMongoDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info('MongoDB already connected');
      return mongoose.connection;
    }

    // Windows-specific DNS and timeout settings - optimized to prevent timeout errors
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,                // Increased pool size for better performance
      minPoolSize: 2,                 // Increased min pool for better availability
      connectTimeoutMS: 30000,        // Reduced to 30 seconds for faster failure detection
      socketTimeoutMS: 45000,         // Reduced to 45 seconds for better responsiveness
      serverSelectionTimeoutMS: 30000, // Reduced to 30 seconds for faster server selection
      heartbeatFrequencyMS: 5000,     // More frequent heartbeats (5 seconds)
      family: 4,                      // Force IPv4 on Windows
      wtimeoutMS: 30000,              // Write operation timeout
      bufferCommands: true,           // Enable command buffering
      retryWrites: true,              // Enable automatic retry of write operations
      retryReads: true,               // Enable automatic retry of read operations
      autoIndex: true,                // Build indexes
      autoCreate: true                // Create collections if they don't exist
    };

    // Use this approach to handle both connection string formats
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-management';
    
    logger.info(`Connecting to MongoDB: ${uri.replace(/:\/\/([^:]+):[^@]+@/, '://***:***@')}`);
    
    // Set command timeout at the driver level
    mongoose.set('maxTimeMS', 30000);
    
    // Create connection with error handling
    const conn = await mongoose.connect(uri, options);
    
    // Add event listeners for connection handling
    mongoose.connection.on('connected', () => {
      logger.info(`MongoDB connected successfully: ${conn.connection.host}`);
      global._mongoReconnectAttempts = 0;
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
      
      // Handle timeout errors
      if (err.name === 'MongooseError' && err.message.includes('buffering timed out')) {
        logger.warn('MongoDB buffering timeout detected. Attempting to reconnect...');
        setTimeout(() => {
          if (mongoose.connection.readyState !== 1) {
            mongoose.disconnect().then(() => mongoose.connect(uri, options));
          }
        }, 1000);
      }
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected, attempting to reconnect...');
      
      if (!global._mongoReconnectAttempts) {
        global._mongoReconnectAttempts = 0;
      }
      
      global._mongoReconnectAttempts++;
      
      // Use exponential backoff for reconnection
      if (global._mongoReconnectAttempts <= 5) {
        const backoff = Math.min(1000 * Math.pow(2, global._mongoReconnectAttempts), 30000);
        setTimeout(() => {
          logger.info(`Reconnection attempt ${global._mongoReconnectAttempts} after ${backoff}ms`);
          mongoose.connect(uri, options).catch(err => {
            logger.error(`Reconnection attempt failed: ${err.message}`);
          });
        }, backoff);
      } else {
        logger.error('Multiple reconnection attempts failed. MongoDB connection is required.');
        throw new Error('Failed to connect to MongoDB after multiple attempts');
      }
    });
    
    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    logger.error('Cannot continue without MongoDB connection');
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
};

export default connectMongoDB; 