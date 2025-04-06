import logger from './logger.js';

/**
 * Check if required environment variables are set
 * Exits the process if critical variables are missing
 */
export const checkRequiredEnv = () => {
  const requiredVariables = [
    'MONGODB_URI',
    'JWT_SECRET',
    'PORT'
  ];
  
  const missingVars = [];
  
  requiredVariables.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    logger.info('Please create a .env file based on .env.example with the required values');
    process.exit(1);
  }
  
  logger.info('All required environment variables are set');
};

export default { checkRequiredEnv }; 