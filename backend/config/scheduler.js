import cron from 'node-cron';
import logger from './logger.js';
import { getDashboardAnalytics } from '../Controllers/analyticsController.js';

/**
 * Scheduler for refreshing dashboard analytics data
 */
const refreshDashboardData = async () => {
  try {
    logger.info('Refreshing dashboard analytics data');
    
    // Create a mock request and response object to use the controller
    const req = { query: {} };
    const res = {
      json: async (data) => {
        // No longer caching with Redis
        logger.info('Dashboard analytics refreshed');
      },
      status: () => res // For chaining
    };
    
    // Call the analytics controller
    await getDashboardAnalytics(req, res);
  } catch (error) {
    logger.error(`Error refreshing dashboard data: ${error.message}`);
  }
};

/**
 * Scheduler for clearing expired analytics cache
 */
const clearExpiredAnalyticsCache = async () => {
  try {
    // No Redis dependencies, so no need to implement this method
  } catch (error) {
    logger.error(`Error clearing analytics cache: ${error.message}`);
  }
};

/**
 * Initialize all schedulers
 */
export const initSchedulers = () => {
  try {
    // Refresh dashboard data every hour
    cron.schedule('0 * * * *', refreshDashboardData, {
      scheduled: true
    });
    logger.info('Dashboard refresh scheduler initialized (hourly)');
    
    // Clear expired analytics cache once a day at 2 AM
    cron.schedule('0 2 * * *', clearExpiredAnalyticsCache, {
      scheduled: true
    });
    logger.info('Cache cleanup scheduler initialized (daily at 2 AM)');
    
    // Run an initial refresh on startup
    refreshDashboardData();
  } catch (error) {
    logger.error(`Failed to initialize schedulers: ${error.message}`);
  }
};

export default {
  initSchedulers,
  refreshDashboardData,
  clearExpiredAnalyticsCache
}; 