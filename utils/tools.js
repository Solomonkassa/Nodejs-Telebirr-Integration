/**
 * @module utils/tools
 * @description Utility functions for cryptographic operations and request signing
 * @version 2.0.0
 */

const crypto = require('crypto');
const config = require('../config/config');
const pmlib = require('./sign-util-lib');

/**
 * Fields that should not participate in signature generation
 * @type {string[]}
 * @constant
 */
const EXCLUDE_FIELDS = [
  'sign',
  'sign_type',
  'header',
  'refund_info',
  'openType',
  'raw_request',
  'biz_content', // biz_content fields are handled separately
];

/**
 * Algorithms supported for signing
 * @type {Object}
 * @constant
 */
const SIGNING_ALGORITHMS = {
  SHA256WithRSA: 'SHA256withRSAandMGF1',
  SHA1WithRSA: 'SHA1withRSA',
  MD5WithRSA: 'MD5withRSA',
};

/**
 * Character set for generating random strings
 * @type {string}
 * @constant
 */
const NONCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Default nonce string length
 * @type {number}
 * @constant
 */
const DEFAULT_NONCE_LENGTH = 32;

/**
 * Validates and prepares an object for signing
 * @private
 * @param {Object} obj - The object to validate
 * @returns {Object} The validated and prepared object
 * @throws {Error} If the object is invalid
 */
const validateAndPrepareObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Invalid request object: must be a non-null object');
  }

  if (Array.isArray(obj)) {
    throw new Error('Invalid request object: cannot be an array');
  }

  // Create a deep copy to avoid mutating the original
  const preparedObj = JSON.parse(JSON.stringify(obj));

  // Remove any undefined or null values (but keep empty strings)
  Object.keys(preparedObj).forEach(key => {
    if (preparedObj[key] === undefined || preparedObj[key] === null) {
      delete preparedObj[key];
    }
  });

  return preparedObj;
};

/**
 * Flattens nested objects for signing (handles biz_content specifically)
 * @private
 * @param {Object} requestObject - The request object to flatten
 * @returns {Object} Flattened object with all signing fields
 */
const flattenObjectForSigning = (requestObject) => {
  const flattened = { ...requestObject };
  
  // Remove biz_content from top level as we'll add its fields individually
  delete flattened.biz_content;

  // If biz_content exists, add its fields to the flattened object
  if (requestObject.biz_content && typeof requestObject.biz_content === 'object') {
    const bizContent = requestObject.biz_content;
    
    Object.keys(bizContent).forEach(key => {
      if (!EXCLUDE_FIELDS.includes(key) && 
          bizContent[key] !== undefined && 
          bizContent[key] !== null) {
        flattened[key] = bizContent[key];
      }
    });
  }

  return flattened;
};

/**
 * Generates a signature for a request object
 * @function signRequestObject
 * @param {Object} requestObject - The request object to sign
 * @param {string} [privateKey] - Optional private key (defaults to config.privateKey)
 * @returns {string} The generated signature
 * @throws {Error} If signing fails or parameters are invalid
 * 
 * @example
 * const signature = signRequestObject({
 *   timestamp: "1234567890",
 *   nonce_str: "ABC123",
 *   biz_content: {
 *     amount: "100.00",
 *     currency: "ETB"
 *   }
 * });
 */
const signRequestObject = (requestObject, privateKey = config.privateKey) => {
  try {
    // Validate inputs
    if (!requestObject) {
      throw new Error('Request object is required');
    }

    if (!privateKey) {
      throw new Error('Private key is required for signing');
    }

    const validatedObject = validateAndPrepareObject(requestObject);
    const flattenedObject = flattenObjectForSigning(validatedObject);

    // Get all field names that should participate in signing
    const fieldNames = Object.keys(flattenedObject)
      .filter(key => !EXCLUDE_FIELDS.includes(key))
      .sort(); // Sort by ASCII order

    if (fieldNames.length === 0) {
      throw new Error('No signable fields found in request object');
    }

    // Build the sign string
    const signParts = fieldNames.map(key => {
      const value = flattenedObject[key];
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `${key}=${stringValue}`;
    });

    const signOriginStr = signParts.join('&');
    
    if (config.enableDebugLogging) {
      console.log('[Tools] Sign origin string:', signOriginStr);
      console.log('[Tools] Fields included:', fieldNames);
    }

    // Generate the signature
    const signature = signString(signOriginStr, privateKey, SIGNING_ALGORITHMS.SHA256WithRSA);
    
    if (config.enableDebugLogging) {
      console.log('[Tools] Signature generated successfully');
    }

    return signature;
  } catch (error) {
    console.error('[Tools] Error signing request object:', {
      error: error.message,
      object: requestObject,
      stack: config.env === 'development' ? error.stack : undefined,
    });
    throw new Error(`Failed to sign request: ${error.message}`);
  }
};

/**
 * Signs a string with RSA private key
 * @function signString
 * @param {string} text - The text to sign
 * @param {string} privateKey - The RSA private key
 * @param {string} [algorithm=SHA256WithRSA] - The signing algorithm to use
 * @returns {string} Base64 encoded signature
 * @throws {Error} If signing fails
 * 
 * @example
 * const signature = signString('key1=value1&key2=value2', privateKey);
 */
const signString = (text, privateKey, algorithm = SIGNING_ALGORITHMS.SHA256WithRSA) => {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    if (!privateKey || typeof privateKey !== 'string') {
      throw new Error('Private key must be a non-empty string');
    }

    // Validate private key format (basic check)
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.warn('[Tools] Private key may not be in proper PEM format');
    }

    // Create signature using pmlib
    const signature = new pmlib.rs.KJUR.crypto.Signature({ alg: algorithm });
    signature.init(privateKey);
    signature.updateString(text);
    
    // Convert hex to base64
    const hexSignature = signature.sign();
    const base64Signature = pmlib.rs.hextob64(hexSignature);
    
    if (config.enableDebugLogging) {
      console.log('[Tools] String signed successfully:', {
        textLength: text.length,
        algorithm: algorithm,
        signatureLength: base64Signature.length,
      });
    }
    
    return base64Signature;
  } catch (error) {
    console.error('[Tools] Error signing string:', {
      error: error.message,
      textPreview: text ? text.substring(0, 100) + '...' : 'empty',
      algorithm: algorithm,
    });
    throw new Error(`Failed to sign string: ${error.message}`);
  }
};

/**
 * Verifies a signature against a string using public key
 * @function verifySignature
 * @param {string} text - The original text
 * @param {string} signature - The signature to verify (base64)
 * @param {string} publicKey - The RSA public key
 * @param {string} [algorithm=SHA256WithRSA] - The signing algorithm
 * @returns {boolean} True if signature is valid
 * 
 * @example
 * const isValid = verifySignature(text, signature, publicKey);
 */
const verifySignature = (text, signature, publicKey, algorithm = SIGNING_ALGORITHMS.SHA256WithRSA) => {
  try {
    if (!text || !signature || !publicKey) {
      console.warn('[Tools] Missing parameters for signature verification');
      return false;
    }

    // Convert base64 signature to hex
    const hexSignature = pmlib.rs.b64tohex(signature);
    
    // Create verifier
    const verifier = new pmlib.rs.KJUR.crypto.Signature({ alg: algorithm });
    verifier.init(publicKey);
    verifier.updateString(text);
    
    const isValid = verifier.verify(hexSignature);
    
    if (config.enableDebugLogging) {
      console.log('[Tools] Signature verification result:', {
        isValid: isValid,
        algorithm: algorithm,
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('[Tools] Error verifying signature:', {
      error: error.message,
      textPreview: text.substring(0, 100) + '...',
    });
    return false;
  }
};

/**
 * Creates a UNIX timestamp string
 * @function createTimeStamp
 * @returns {string} Current UNIX timestamp as string
 * 
 * @example
 * const timestamp = createTimeStamp(); // "1234567890"
 */
const createTimeStamp = () => {
  return Math.floor(Date.now() / 1000).toString();
};

/**
 * Generates a cryptographically secure random nonce string
 * @function createNonceStr
 * @param {number} [length=32] - Length of the nonce string
 * @returns {string} Random nonce string
 * @throws {Error} If crypto.randomBytes fails
 * 
 * @example
 * const nonce = createNonceStr(32); // "ABC123DEF456..."
 */
const createNonceStr = (length = DEFAULT_NONCE_LENGTH) => {
  try {
    if (length <= 0) {
      throw new Error('Length must be greater than 0');
    }

    if (length > 1024) {
      console.warn('[Tools] Nonce length exceeds recommended maximum');
    }

    // Use crypto.randomBytes for cryptographically secure randomness
    const randomBytes = crypto.randomBytes(length);
    let nonce = '';
    
    for (let i = 0; i < length; i++) {
      // Map random byte to our character set
      const charIndex = randomBytes[i] % NONCE_CHARS.length;
      nonce += NONCE_CHARS[charIndex];
    }
    
    if (config.enableDebugLogging) {
      console.log('[Tools] Nonce generated:', {
        length: length,
        noncePreview: nonce.substring(0, 10) + '...',
      });
    }
    
    return nonce;
  } catch (error) {
    console.error('[Tools] Error generating nonce:', error.message);
    
    // Fallback to Math.random if crypto.randomBytes fails (not cryptographically secure)
    console.warn('[Tools] Falling back to Math.random for nonce generation');
    
    let fallbackNonce = '';
    for (let i = 0; i < length; i++) {
      const charIndex = Math.floor(Math.random() * NONCE_CHARS.length);
      fallbackNonce += NONCE_CHARS[charIndex];
    }
    
    return fallbackNonce;
  }
};

/**
 * Creates a unique merchant order ID with timestamp and random suffix
 * @function createMerchantOrderId
 * @param {string} [prefix='ORDER'] - Prefix for the order ID
 * @returns {string} Unique merchant order ID
 * 
 * @example
 * const orderId = createMerchantOrderId(); // "ORDER_1234567890_ABC123"
 */
const createMerchantOrderId = (prefix = 'ORDER') => {
  const timestamp = Date.now();
  const randomPart = createNonceStr(8); // 8 character random suffix
  return `${prefix}_${timestamp}_${randomPart}`;
};

/**
 * Validates a signature for a request object
 * @function validateRequestSignature
 * @param {Object} requestObject - The request object with signature
 * @param {string} publicKey - The RSA public key
 * @returns {boolean} True if signature is valid
 * 
 * @example
 * const isValid = validateRequestSignature(requestObject, publicKey);
 */
const validateRequestSignature = (requestObject, publicKey) => {
  try {
    if (!requestObject || !requestObject.sign) {
      console.warn('[Tools] Request object missing signature');
      return false;
    }

    if (!publicKey) {
      throw new Error('Public key is required for validation');
    }

    // Extract signature and sign_type from request
    const { sign, sign_type, ...objectWithoutSignature } = requestObject;
    
    // Recreate the signature using the same logic
    const expectedSignature = signRequestObject(objectWithoutSignature, config.privateKey);
    
    // Compare signatures
    const isValid = sign === expectedSignature;
    
    if (!isValid && config.enableDebugLogging) {
      console.warn('[Tools] Signature validation failed:', {
        providedSignature: sign.substring(0, 20) + '...',
        expectedSignature: expectedSignature.substring(0, 20) + '...',
        signType: sign_type,
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('[Tools] Error validating request signature:', error.message);
    return false;
  }
};

/**
 * Creates a hash of a string (for non-cryptographic purposes)
 * @function createHash
 * @param {string} text - Text to hash
 * @param {string} [algorithm='sha256'] - Hash algorithm
 * @returns {string} Hexadecimal hash
 * 
 * @example
 * const hash = createHash('some text');
 */
const createHash = (text, algorithm = 'sha256') => {
  try {
    const hash = crypto.createHash(algorithm);
    hash.update(text);
    return hash.digest('hex');
  } catch (error) {
    console.error('[Tools] Error creating hash:', error.message);
    throw error;
  }
};

module.exports = {
  signString,
  signRequestObject,
  createTimeStamp,
  createNonceStr,
  createMerchantOrderId,
  verifySignature,
  validateRequestSignature,
  createHash,
  SIGNING_ALGORITHMS,
};