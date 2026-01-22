/**
 * @module config/config
 * @description Configuration settings for the Fabric Payment API
 * @version 2.0.0
 */

// Load environment variables from .env file if it exists
require('dotenv').config();

/**
 * Application environment
 * @type {string}
 */
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Application configuration
 * @typedef {Object} AppConfig
 * @property {string} baseUrl - Fabric API base URL
 * @property {string} fabricAppId - Fabric application ID
 * @property {string} appSecret - Fabric application secret
 * @property {string} merchantAppId - Merchant application ID
 * @property {string} merchantCode - Merchant code
 * @property {string} privateKey - RSA private key for signing
 * @property {string} [publicKey] - RSA public key for verification (optional)
 * @property {number} apiTimeout - API request timeout in milliseconds
 * @property {string} env - Current environment
 * @property {boolean} enableDebugLogging - Enable detailed debug logging
 * @property {string} currency - Default transaction currency
 * @property {string} orderTimeout - Default order timeout
 * @property {string} payeeIdentifier - Payee identifier
 * @property {string} payeeIdentifierType - Payee identifier type
 * @property {string} payeeType - Payee type
 * @property {string} notifyUrl - Webhook notification URL
 * @property {string} redirectUrl - Payment redirect URL
 * @property {string} [mandateTemplateId] - Mandate template ID (optional)
 * @property {string[]} allowedOrigins - CORS allowed origins
 * @property {Object} security - Security related configurations
 * @property {number} security.rateLimitWindowMs - Rate limiting window
 * @property {number} security.rateLimitMaxRequests - Max requests per window
 */

/**
 * Main configuration object
 * @type {AppConfig}
 */
const config = {
  // ============================================
  // API Configuration
  // ============================================
  
  // Base URL for Fabric API
  baseUrl: process.env.FABRIC_BASE_URL || 
    'https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway',
  
  // Fabric API credentials
  fabricAppId: process.env.FABRIC_APP_ID || '7ca6ef17-df90-45a9-a589-62ea3d94d3fb',
  appSecret: process.env.FABRIC_APP_SECRET || 'aae8a4cc8044212577ae5edf0f0a74d9',
  
  // Merchant credentials
  merchantAppId: process.env.MERCHANT_APP_ID || '1184379249100809',
  merchantCode: process.env.MERCHANT_CODE || '735013',
  
  // ============================================
  // Security Configuration
  // ============================================
  
  // RSA Private Key (PEM format)
  privateKey: process.env.PRIVATE_KEY || `
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC/ZcoOng1sJZ4CegopQVCw3HYqqVRLEudgT+dDpS8fRVy7zBgqZunju2VRCQuHeWs7yWgc9QGd4/8kRSLY+jlvKNeZ60yWcqEY+eKyQMmcjOz2Sn41fcVNgF+HV3DGiV4b23B6BCMjnpEFIb9d99/TsjsFSc7gCPgfl2yWDxE/Y1B2tVE6op2qd63YsMVFQGdre/CQYvFJENpQaBLMq4hHyBDgluUXlF0uA1X7UM0ZjbFC6ZIB/Hn1+pl5Ua8dKYrkVaecolmJT/s7c/+/1JeN+ja8luBoONsoODt2mTeVJHLF9Y3oh5rI+IY8HukIZJ1U6O7/JcjH3aRJTZagXUS9AgMBAAECggEBALBIBx8JcWFfEDZFwuAWeUQ7+VX3mVx/770kOuNx24HYt718D/HV0avfKETHqOfA7AQnz42EF1Yd7Rux1ZO0e3unSVRJhMO4linT1XjJ9ScMISAColWQHk3wY4va/FLPqG7N4L1w3BBtdjIc0A2zRGLNcFDBlxl/CVDHfcqD3CXdLukm/friX6TvnrbTyfAFicYgu0+UtDvfxTL3pRL3u3WTkDvnFK5YXhoazLctNOFrNiiIpCW6dJ7WRYRXuXhz7C0rENHyBtJ0zura1WD5oDbRZ8ON4v1KV4QofWiTFXJpbDgZdEeJJmFmt5HIi+Ny3P5n31WwZpRMHGeHrV23//0CgYEA+2/gYjYWOW3JgMDLX7r8fGPTo1ljkOUHuH98H/a/lE3wnnKKx+2ngRNZX4RfvNG4LLeWTz9plxR2RAqqOTbX8fj/NA/sS4mru9zvzMY1925FcX3WsWKBgKlLryl0vPScq4ejMLSCmypGz4VgLMYZqT4NYIkU2Lo1G1MiDoLy0CcCgYEAwt77exynUhM7AlyjhAA2wSINXLKsdFFF1u976x9kVhOfmbAutfMJPEQWb2WXaOJQMvMpgg2rU5aVsyEcuHsRH/2zatrxrGqLqgxaiqPz4ELINIh1iYK/hdRpr1vATHoebOv1wt8/9qxITNKtQTgQbqYci3KV1lPsOrBAB5S57nsCgYAvw+cagS/jpQmcngOEoh8I+mXgKEET64517DIGWHe4kr3dO+FFbc5eZPCbhqgxVJ3qUM4LK/7BJq/46RXBXLvVSfohR80Z5INtYuFjQ1xJLveeQcuhUxdK+95W3kdBBi8lHtVPkVsmYvekwK+ukcuaLSGZbzE4otcn47kajKHYDQKBgDbQyIbJ+ZsRw8CXVHu2H7DWJlIUBIS3s+CQ/xeVfgDkhjmSIKGX2to0AOeW+S9MseiTE/L8a1wY+MUppE2UeK26DLUbH24zjlPoI7PqCJjl0DFOzVlACSXZKV1lfsNEeriC61/EstZtgezyOkAlSCIH4fGr6tAeTU349Bnt0RtvAoGBAObgxjeH6JGpdLz1BbMj8xUHuYQkbxNeIPhH29CySn0vfhwg9VxAtIoOhvZeCfnsCRTj9OZjepCeUqDiDSoFznglrKhfeKUndHjvg+9kiae92iI6qJudPCHMNwP8wMSphkxUqnXFR3lr9A765GA980818UWZdrhrjLKtIIZdh+X1
-----END PRIVATE KEY-----`,
  
  // RSA Public Key (optional, for signature verification)
  publicKey: process.env.PUBLIC_KEY || '',
  
  // ============================================
  // Application Settings
  // ============================================
  
  // Environment
  env: NODE_ENV,
  
  // Debug logging
  enableDebugLogging: process.env.ENABLE_DEBUG_LOGGING === 'true' || NODE_ENV === 'development',
  
  // API timeout in milliseconds
  apiTimeout: parseInt(process.env.API_TIMEOUT) || 30000, // 30 seconds
  
  // ============================================
  // Payment Settings
  // ============================================
  
  // Default currency
  currency: process.env.CURRENCY || 'ETB',
  
  // Default order timeout
  orderTimeout: process.env.ORDER_TIMEOUT || '120m',
  
  // Payee information
  payeeIdentifier: process.env.PAYEE_IDENTIFIER || '220311',
  payeeIdentifierType: process.env.PAYEE_IDENTIFIER_TYPE || '04',
  payeeType: process.env.PAYEE_TYPE || '5000',
  
  // Mandate configuration (if applicable)
  mandateTemplateId: process.env.MANDATE_TEMPLATE_ID || '103001',
  
  // ============================================
  // Webhook & Redirect URLs
  // ============================================
  
  // Notification webhook URL (where Fabric sends payment notifications)
  notifyUrl: process.env.NOTIFY_URL || 
    'https://node-api-muxu.onrender.com/api/v1/notify',
  
  // Redirect URL after payment completion
  redirectUrl: process.env.REDIRECT_URL || 
    'https://node-api-muxu.onrender.com/api/v1/notify',
  
  // ============================================
  // CORS Configuration
  // ============================================
  
  // Allowed origins for CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : ['*'],
  
  // ============================================
  // Security Settings
  // ============================================
  
  security: {
    // Rate limiting configuration
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    
    // Request size limits
    maxRequestBodySize: process.env.MAX_REQUEST_BODY_SIZE || '10mb',
    
    // Session/Token settings
    tokenExpiryMinutes: parseInt(process.env.TOKEN_EXPIRY_MINUTES) || 60,
  },
};

/**
 * Validates the configuration for critical errors
 * @function validateConfig
 * @returns {Object} Validation result
 */
const validateConfig = () => {
  const errors = [];
  const warnings = [];
  
  // Critical validations
  if (!config.baseUrl || config.baseUrl.includes('example.com')) {
    errors.push('baseUrl is not configured or is using example URL');
  }
  
  if (!config.fabricAppId || config.fabricAppId === 'your_app_id') {
    errors.push('fabricAppId is not properly configured');
  }
  
  if (!config.appSecret || config.appSecret === 'your_app_secret') {
    errors.push('appSecret is not properly configured');
  }
  
  if (!config.privateKey || config.privateKey.includes('YOUR_PRIVATE_KEY')) {
    errors.push('privateKey is not properly configured');
  }
  
  // Warning validations
  if (config.env === 'production' && config.enableDebugLogging) {
    warnings.push('Debug logging is enabled in production environment');
  }
  
  if (config.allowedOrigins.includes('*') && config.env === 'production') {
    warnings.push('CORS is configured to allow all origins in production');
  }
  
  if (!config.publicKey && config.env === 'production') {
    warnings.push('Public key is not configured for signature verification');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings,
    environment: config.env,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Gets a configuration value with optional default
 * @function getConfig
 * @param {string} key - Configuration key
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {any} Configuration value
 */
const getConfig = (key, defaultValue = null) => {
  const keys = key.split('.');
  let value = config;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return defaultValue;
    }
  }
  
  return value !== undefined ? value : defaultValue;
};

/**
 * Returns a safe version of config without sensitive data for logging
 * @function getSafeConfig
 * @returns {Object} Configuration without sensitive data
 */
const getSafeConfig = () => {
  const safeConfig = { ...config };
  
  // Remove or mask sensitive data
  delete safeConfig.appSecret;
  delete safeConfig.privateKey;
  delete safeConfig.publicKey;
  
  // Mask partial sensitive data
  if (safeConfig.fabricAppId) {
    safeConfig.fabricAppId = `${safeConfig.fabricAppId.substring(0, 8)}...`;
  }
  
  if (safeConfig.merchantAppId) {
    safeConfig.merchantAppId = `${safeConfig.merchantAppId.substring(0, 8)}...`;
  }
  
  if (safeConfig.merchantCode) {
    safeConfig.merchantCode = `${safeConfig.merchantCode.substring(0, 4)}...`;
  }
  
  return safeConfig;
};

/**
 * Logs the current configuration (safe version)
 * @function logConfiguration
 */
const logConfiguration = () => {
  const validation = validateConfig();
  const safeConfig = getSafeConfig();
  
  console.log('='.repeat(80));
  console.log('📋 Application Configuration');
  console.log('='.repeat(80));
  console.log(`Environment: ${config.env}`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`API Timeout: ${config.apiTimeout}ms`);
  console.log(`Currency: ${config.currency}`);
  console.log(`Debug Logging: ${config.enableDebugLogging ? 'Enabled' : 'Disabled'}`);
  console.log(`Allowed Origins: ${config.allowedOrigins.join(', ')}`);
  console.log('-'.repeat(80));
  
  if (validation.errors.length > 0) {
    console.error('❌ Configuration Errors:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Configuration Warnings:');
    validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
  
  if (validation.isValid && validation.warnings.length === 0) {
    console.log('✅ Configuration is valid');
  }
  
  console.log('='.repeat(80));
};

// Log configuration on startup (in development)
if (config.env === 'development' && process.env.NODE_ENV !== 'test') {
  logConfiguration();
}

module.exports = config;
module.exports.validateConfig = validateConfig;
module.exports.getConfig = getConfig;
module.exports.getSafeConfig = getSafeConfig;
module.exports.logConfiguration = logConfiguration;