/**
 * Utility script to reset tokens in the database
 * This helps clear any invalid tokens and refresh token caches
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { userModel } from '../schemas/userSchema.js';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-management';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Reset all tokens
const resetTokens = async () => {
  try {
    await connectDB();
    
    console.log('Resetting all refresh tokens...');
    const result = await userModel.updateMany(
      {}, 
      { $set: { refreshToken: null } }
    );
    
    console.log(`Reset ${result.modifiedCount} user tokens`);
    
    // Also clear token blacklist cache file if it exists
    const cacheFiles = [
      path.join(process.cwd(), 'node-cache'),
      path.join(process.cwd(), '.node-cache')
    ];
    
    cacheFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log(`Deleted cache file: ${file}`);
        } catch (err) {
          console.error(`Error deleting cache file ${file}:`, err);
        }
      }
    });
    
    console.log('Token reset complete!');
    
    // Close connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting tokens:', error);
    process.exit(1);
  }
};

// Run the script
resetTokens(); 