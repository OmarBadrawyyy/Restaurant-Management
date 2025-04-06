import cron from 'node-cron';
import { reconcilePayments } from '../Controllers/paymentController.js';
import logger from '../config/logger.js';

/**
 * Schedule daily payment reconciliation job
 * Runs every day at 2:00 AM to reconcile yesterday's payments
 */
export const schedulePaymentReconciliation = () => {
  // Schedule to run at 2:00 AM every day (server time)
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Starting scheduled payment reconciliation job');
      
      // Calculate yesterday's date range
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      
      // Run reconciliation for yesterday
      const result = await reconcilePayments(yesterday, endOfYesterday);
      
      if (result.success) {
        logger.info(`Payment reconciliation job completed successfully. Processed ${result.processed} payment intents.`);
      } else {
        logger.error(`Payment reconciliation job failed: ${result.error}`);
      }
    } catch (error) {
      logger.error(`Error running payment reconciliation job: ${error.message}`, { error });
    }
  });
  
  logger.info('Payment reconciliation job scheduled to run at 2:00 AM daily');
};

/**
 * Run payment reconciliation for a custom date range
 * @param {string} startDate - Start date in ISO format (YYYY-MM-DD)
 * @param {string} endDate - End date in ISO format (YYYY-MM-DD)
 */
export const runCustomReconciliation = async (startDate, endDate) => {
  try {
    logger.info(`Running custom payment reconciliation for period: ${startDate} to ${endDate}`);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const result = await reconcilePayments(start, end);
    
    if (result.success) {
      logger.info(`Custom payment reconciliation completed successfully. Processed ${result.processed} payment intents.`);
      return { success: true, processed: result.processed };
    } else {
      logger.error(`Custom payment reconciliation failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    logger.error(`Error running custom payment reconciliation: ${error.message}`, { error });
    return { success: false, error: error.message };
  }
};

export default {
  schedulePaymentReconciliation,
  runCustomReconciliation
}; 