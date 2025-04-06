import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Connect to MongoDB with optimized connection pooling
 */
export const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log(`MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-management'}`);
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 3,
      socketTimeoutMS: 2000,           // Further reduced
      serverSelectionTimeoutMS: 2000,  // Further reduced
      heartbeatFrequencyMS: 10000,
      connectTimeoutMS: 2000,          // Further reduced
      retryWrites: true,
      retryReads: true,
      w: 1,
      wtimeoutMS: 2000,                // Further reduced
      bufferCommands: false,
      maxIdleTimeMS: 60000,
      autoIndex: false,                // Disable auto-indexing
      autoCreate: true,
      family: 4
    };

    // Try to connect with a timeout
    let conn;
    try {
      // Set a timeout for the connection attempt
      const connectionPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-management', options);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 3000);
      });
      
      // Race the connection against the timeout
      conn = await Promise.race([connectionPromise, timeoutPromise]);
      
      console.log('MongoDB connection successful!');
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (dbError) {
      console.error('MongoDB connection failed:', dbError.message);
      logger.error(`MongoDB connection failed: ${dbError.message}`);
      return null; // Return null to indicate connection failed
    }
    
    // Do not attempt model verification if connection failed
    if (!conn) return null;
    
    // Set up minimal connection event listeners
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed due to app termination');
      } catch (err) {
        logger.error(`Error closing MongoDB connection: ${err.message}`);
      }
    });
    
    return conn;
  } catch (error) {
    console.error('===== MongoDB CONNECTION ERROR =====');
    console.error(error);
    console.error('====================================');
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    return null; // Return null instead of throwing error
  }
};

export default { connectDB }; 