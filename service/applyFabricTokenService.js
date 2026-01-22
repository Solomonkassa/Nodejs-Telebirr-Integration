/**
 * @module services/fabricTokenService
 * @description Service for obtaining and managing Fabric API authentication tokens.
 * @version 2.0.0
 */

const axios = require('axios');
const config = require('../config/config');

// Configure axios instance for Fabric API
const fabricApiClient = axios.create({
  baseURL: config.baseUrl,
  timeout: config.apiTimeout || 10000, // 10 seconds default
  headers: {
    'Content-Type': 'application/json',
    'X-APP-Key': config.fabricAppId,
  },
});

// Add request interceptor for logging (optional)
if (config.enableApiLogging) {
  fabricApiClient.interceptors.request.use(
    function(request) {
      console.log('[Fabric API] ' + (request.method ? request.method.toUpperCase() : 'GET') + ' ' + (request.url || ''));
      return request;
    },
    function(error) {
      console.error('[Fabric API] Request Error:', error.message);
      return Promise.reject(error);
    }
  );
}

// Add response interceptor for consistent error handling
fabricApiClient.interceptors.response.use(
  function(response) {
    return response;
  },
  function(error) {
    if (error.response) {
      console.error(
        '[Fabric API] ' + 
        (error.config && error.config.method ? error.config.method.toUpperCase() : 'GET') + ' ' + 
        (error.config && error.config.url ? error.config.url : '') + 
        ' failed with status ' + error.response.status
      );
    } else if (error.request) {
      console.error('[Fabric API] No response received:', error.message);
    } else {
      console.error('[Fabric API] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * @typedef {Object} FabricTokenResponse
 * @property {string} token - The authentication token
 * @property {number} expiresIn - Token validity in seconds
 * @property {string} [refreshToken] - Optional refresh token
 * @property {string} tokenType - Token type (e.g., "Bearer")
 */

/**
 * @typedef {Object} TokenCache
 * @property {FabricTokenResponse} data - Token data
 * @property {number} expiresAt - Timestamp when token expires
 */

/**
 * In-memory token cache with TTL support
 * @type {TokenCache|null}
 */
let tokenCache = null;

/**
 * Generates a cache key for the token request
 * @private
 * @returns {string} Cache key
 */
const getCacheKey = function() {
  return config.fabricAppId + ':' + (config.appSecret ? config.appSecret.substring(0, 8) : '');
};

/**
 * Validates if the cached token is still valid
 * @private
 * @param {TokenCache} cache - The cached token data
 * @returns {boolean} True if token is still valid
 */
const isTokenValid = function(cache) {
  if (!cache) {
    return false;
  }
  
  // Add 30-second buffer to account for network latency
  const bufferSeconds = 30;
  return Date.now() < (cache.expiresAt - bufferSeconds * 1000);
};

/**
 * Clears the cached token
 * @public
 */
const clearTokenCache = function() {
  tokenCache = null;
  console.log('[Fabric Token] Cache cleared');
};

/**
 * Requests a new authentication token from Fabric API
 * @private
 * @async
 * @returns {Promise<FabricTokenResponse>} Token response from API
 * @throws {Error} If API request fails
 */
const requestNewToken = async function() {
  try {
    const response = await fabricApiClient.post('/payment/v1/token', {
      appSecret: config.appSecret,
    });

    const tokenData = response.data;
    
    // Validate token response structure
    if (!tokenData || !tokenData.token) {
      throw new Error('Invalid token response: missing token field');
    }

    console.log('[Fabric Token] New token obtained successfully');
    return tokenData;
  } catch (error) {
    console.error('[Fabric Token] Failed to obtain new token:', {
      message: error.message,
      status: error.response && error.response.status,
      data: error.response && error.response.data,
    });
    throw error;
  }
};

/**
 * Applies for or retrieves a cached Fabric authentication token
 * @async
 * @function applyFabricToken
 * @returns {Promise<FabricTokenResponse>} Authentication token data
 * @throws {Error} When unable to obtain a valid token
 * 
 * @example
 * try {
 *   const tokenData = await applyFabricToken();
 *   console.log('Token: ' + tokenData.token);
 * } catch (error) {
 *   console.error('Authentication failed:', error);
 * }
 */
const applyFabricToken = async function() {
  const cacheKey = getCacheKey();
  
  // Return cached token if valid
  if (tokenCache && isTokenValid(tokenCache)) {
    console.log('[Fabric Token] Using cached token for ' + cacheKey);
    return tokenCache.data;
  }

  console.log('[Fabric Token] Requesting new token for ' + cacheKey);
  
  try {
    const tokenData = await requestNewToken();
    
    // Calculate expiration with fallback to default (1 hour)
    const expiresIn = tokenData.expiresIn || 3600;
    
    // Cache the token
    tokenCache = {
      data: tokenData,
      expiresAt: Date.now() + (expiresIn * 1000),
    };

    console.log('[Fabric Token] Token cached, expires in ' + expiresIn + ' seconds');
    return tokenData;
  } catch (error) {
    // Clear invalid cache on failure
    clearTokenCache();
    
    // Re-throw with more context
    throw new Error('Failed to apply Fabric token: ' + error.message);
  }
};

/**
 * Checks if a valid token is cached
 * @function hasValidToken
 * @returns {boolean} True if a valid token is cached
 */
const hasValidToken = function() {
  return isTokenValid(tokenCache);
};

/**
 * Gets the currently cached token data (if any)
 * @function getCachedToken
 * @returns {FabricTokenResponse|null} Cached token or null
 */
const getCachedToken = function() {
  return tokenCache && tokenCache.data ? tokenCache.data : null;
};

module.exports = applyFabricToken;
module.exports.clearTokenCache = clearTokenCache;
module.exports.hasValidToken = hasValidToken;
module.exports.getCachedToken = getCachedToken;