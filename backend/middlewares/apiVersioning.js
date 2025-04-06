import logger from '../config/logger.js';

/**
 * Middleware for API versioning
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
const apiVersioning = (options = {}) => {
  const defaultOptions = {
    defaultVersion: 'v1',
    supportedVersions: ['v1'],
    deprecatedVersions: []
  };

  const config = { ...defaultOptions, ...options };

  return (req, res, next) => {
    // Get requested version from header, query param, or URL path
    let requestedVersion = req.headers['accept-version'] || 
                          req.query.version || 
                          req.params.version || 
                          config.defaultVersion;
    
    // Normalize version format (ensure it starts with 'v')
    if (!requestedVersion.startsWith('v')) {
      requestedVersion = `v${requestedVersion}`;
    }

    // Check if version is supported
    if (!config.supportedVersions.includes(requestedVersion)) {
      logger.warn(`Unsupported API version requested: ${requestedVersion}`);
      return res.status(400).json({
        status: 'error',
        message: `Unsupported API version. Supported versions: ${config.supportedVersions.join(', ')}`
      });
    }

    // Check if version is deprecated
    if (config.deprecatedVersions.includes(requestedVersion)) {
      // Add deprecation warning header
      res.set('Warning', `299 - "Deprecated API Version: ${requestedVersion}. Please upgrade to the latest version."`);
      logger.info(`Deprecated API version used: ${requestedVersion}`);
    }

    // Add version to request object for use in routes
    req.apiVersion = requestedVersion;
    
    next();
  };
};

export default apiVersioning; 