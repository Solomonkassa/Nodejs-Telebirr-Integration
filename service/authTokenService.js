/**
 * @module controllers/authController
 * @description Controller for handling authentication token verification with Fabric API
 * @version 2.0.0
 */

const applyFabricTokenService = require('./applyFabricTokenService');
const tools = require('../utils/tools');
const config = require('../config/config');
const axios = require('axios');

// Configure HTTP client for Fabric API
const httpClient = axios.create({
  baseURL: config.baseUrl,
  timeout: config.apiTimeout || 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-APP-Key': config.fabricAppId,
  },
  httpsAgent: config.env === 'development' 
    ? new (require('https').Agent)({ rejectUnauthorized: false })
    : undefined,
});

/**
 * @typedef {Object} AuthTokenRequest
 * @property {string} authToken - The application authentication token
 */

/**
 * @typedef {Object} AuthTokenResponse
 * @property {string} open_id - User's open ID
 * @property {string} token_status - Token verification status
 * @property {number} timestamp - Response timestamp
 * @property {string} [error_code] - Error code if verification fails
 * @property {string} [error_msg] - Error message if verification fails
 */

/**
 * @typedef {Object} FabricAuthRequest
 * @property {string} timestamp - Request timestamp
 * @property {string} method - API method name
 * @property {string} nonce_str - Nonce string for security
 * @property {string} version - API version
 * @property {Object} biz_content - Business content
 * @property {string} sign - Request signature
 * @property {string} sign_type - Signature type
 */

/**
 * @typedef {Object} BusinessContent
 * @property {string} access_token - Application access token
 * @property {string} trade_type - Trade type (e.g., "InApp")
 * @property {string} appid - Merchant application ID
 * @property {string} resource_type - Resource type (e.g., "OpenId")
 */

/**
 * Request and response logger middleware
 * @param {string} endpoint - API endpoint
 * @param {Object} requestData - Request data
 * @param {Object} responseData - Response data
 * @param {number} duration - Request duration in ms
 */
const logRequest = (endpoint, requestData, responseData, duration) => {
  const requestId = requestData && requestData.nonce_str ? requestData.nonce_str : 'unknown';
  const errorCode = responseData && responseData.error_code ? responseData.error_code : null;
  const hasOpenId = responseData && responseData.open_id ? true : false;
  
  const logData = {
    timestamp: new Date().toISOString(),
    endpoint: endpoint,
    requestId: requestId,
    duration: duration + 'ms',
    request: {
      method: requestData && requestData.method ? requestData.method : 'unknown',
      appId: requestData && requestData.biz_content && requestData.biz_content.appid 
        ? requestData.biz_content.appid 
        : 'unknown',
      resourceType: requestData && requestData.biz_content && requestData.biz_content.resource_type 
        ? requestData.biz_content.resource_type 
        : 'unknown',
    },
    response: {
      success: !errorCode,
      errorCode: errorCode,
      hasOpenId: hasOpenId,
    },
  };

  if (config.enableDetailedLogging) {
    console.log('[Auth Controller] Request completed:', JSON.stringify(logData, null, 2));
  } else {
    console.log('[Auth Controller] ' + endpoint + ' - ' + duration + 'ms - ' + (errorCode ? 'FAILED' : 'SUCCESS'));
  }
};

/**
 * Creates a signed request object for Fabric API
 * @private
 * @param {string} appToken - Application authentication token
 * @returns {FabricAuthRequest} Signed request object
 */
const createSignedRequest = (appToken) => {
  const baseRequest = {
    timestamp: tools.createTimeStamp(),
    method: 'payment.authtoken',
    nonce_str: tools.createNonceStr(),
    version: '1.0',
    biz_content: {
      access_token: appToken,
      trade_type: 'InApp',
      appid: config.merchantAppId,
      resource_type: 'OpenId',
    },
  };

  const signature = tools.signRequestObject(baseRequest);
  
  return Object.assign({}, baseRequest, {
    sign: signature,
    sign_type: 'SHA256WithRSA',
  });
};

/**
 * Validates the authentication token request
 * @private
 * @param {AuthTokenRequest} requestBody - Request body
 * @returns {Object} Validation result with isValid flag and errors array
 */
const validateAuthRequest = (requestBody) => {
  const errors = [];
  
  if (!requestBody || !requestBody.authToken) {
    errors.push('authToken is required');
  }
  
  if (requestBody && requestBody.authToken && typeof requestBody.authToken !== 'string') {
    errors.push('authToken must be a string');
  }
  
  if (requestBody && requestBody.authToken && requestBody.authToken.length > 512) {
    errors.push('authToken is too long');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

/**
 * Requests authentication token verification from Fabric API
 * @async
 * @function requestAuthToken
 * @param {string} fabricToken - Fabric API authentication token
 * @param {string} appToken - Application authentication token to verify
 * @returns {Promise<AuthTokenResponse>} Authentication verification result
 * @throws {Error} If API request fails or returns invalid response
 */
exports.requestAuthToken = async (fabricToken, appToken) => {
  const requestObject = createSignedRequest(appToken);
  const startTime = Date.now();
  
  try {
    const response = await httpClient.post('/payment/v1/auth/authToken', requestObject, {
      headers: {
        Authorization: fabricToken,
      },
    });

    const responseData = response.data;
    const duration = Date.now() - startTime;
    
    logRequest('/payment/v1/auth/authToken', requestObject, responseData, duration);
    
    if (!responseData) {
      throw new Error('Empty response from Fabric API');
    }
    
    return responseData;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('[Auth Controller] API request failed:', {
      error: error.message,
      status: error.response && error.response.status,
      data: error.response && error.response.data,
      duration: duration + 'ms',
      requestId: requestObject.nonce_str,
    });
    
    // Return a structured error response
    return {
      error_code: error.response && error.response.status ? error.response.status.toString() : 'REQUEST_FAILED',
      error_msg: error.response && error.response.data && error.response.data.error_msg 
        ? error.response.data.error_msg 
        : error.message,
      timestamp: tools.createTimeStamp(),
      request_id: requestObject.nonce_str,
    };
  }
};

/**
 * Handles authentication token verification requests
 * @async
 * @function authToken
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @example
 * // Request body:
 * {
 *   "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * 
 * // Successful response:
 * {
 *   "open_id": "user_123456",
 *   "token_status": "valid",
 *   "timestamp": 1625097600
 * }
 */
exports.authToken = async (req, res) => {
  const requestId = tools.createNonceStr();
  const startTime = Date.now();
  
  try {
    // Validate request
    const validation = validateAuthRequest(req.body);
    if (!validation.isValid) {
      console.warn('[Auth Controller] Validation failed for request ' + requestId + ':', validation.errors);
      
      return res.status(400).json({
        error_code: 'VALIDATION_ERROR',
        error_msg: validation.errors.join(', '),
        timestamp: tools.createTimeStamp(),
        request_id: requestId,
      });
    }

    const appToken = req.body.authToken;
    
    // Log request (mask token for security)
    console.log('[Auth Controller] Processing auth token verification', {
      requestId: requestId,
      tokenPreview: appToken.substring(0, 10) + '...',
      timestamp: new Date().toISOString(),
    });

    // Obtain Fabric API token
    const fabricTokenResult = await applyFabricTokenService();
    const fabricToken = fabricTokenResult.token;
    
    if (!fabricToken) {
      throw new Error('Failed to obtain Fabric API token');
    }

    // Verify the application token
    const verificationResult = await exports.requestAuthToken(fabricToken, appToken);
    const totalDuration = Date.now() - startTime;
    
    // Log successful processing
    console.log('[Auth Controller] Verification completed', {
      requestId: requestId,
      duration: totalDuration + 'ms',
      success: !verificationResult.error_code,
      hasOpenId: !!verificationResult.open_id,
    });

    // Send appropriate response
    if (verificationResult.error_code) {
      return res.status(400).json(verificationResult);
    }
    
    const response = Object.assign({}, verificationResult, {
      request_id: requestId,
      processed_at: new Date().toISOString(),
    });
    
    return res.json(response);
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    console.error('[Auth Controller] Unexpected error in authToken endpoint', {
      requestId: requestId,
      error: error.message,
      stack: config.env === 'development' ? error.stack : undefined,
      duration: totalDuration + 'ms',
    });

    return res.status(500).json({
      error_code: 'INTERNAL_ERROR',
      error_msg: 'An internal server error occurred',
      timestamp: tools.createTimeStamp(),
      request_id: requestId,
    });
  }
};

/**
 * Health check endpoint for the auth service
 * @async
 * @function healthCheck
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.healthCheck = async (req, res) => {
  try {
    // Try to get a Fabric token as a health check
    const hasFabricToken = applyFabricTokenService.hasValidToken 
      ? await applyFabricTokenService.hasValidToken() 
      : false;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        fabricToken: hasFabricToken ? 'available' : 'requires_refresh',
        apiEndpoint: 'available',
      },
      version: '2.0.0', // Hardcoded version or read from package.json if available
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

/**
 * Get service status and configuration (non-sensitive)
 * @function getServiceInfo
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getServiceInfo = (req, res) => {
  res.json({
    service: 'auth-token-verification',
    version: '2.0.0',
    endpoints: {
      verify: '/api/auth/token',
      health: '/api/auth/health',
      info: '/api/auth/info',
    },
    features: ['token-validation', 'request-signing', 'response-caching'],
    environment: config.env || 'development',
    timestamp: new Date().toISOString(),
  });
};