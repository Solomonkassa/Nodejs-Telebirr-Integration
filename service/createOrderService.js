/**
 * @module services/orderService
 * @description Service for creating payment orders with Fabric API
 * @version 2.0.0
 */

const applyFabricTokenService = require('./applyFabricTokenService');
const tools = require('../utils/tools');
const axios = require('axios');
const config = require('../config/config');

// Configure HTTP client for Fabric API
const httpClient = axios.create({
  baseURL: config.baseUrl,
  timeout: config.apiTimeout || 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-APP-Key': config.fabricAppId,
  },
});

/**
 * @typedef {Object} CreateOrderRequest
 * @property {string} title - Order title/description
 * @property {number|string} amount - Order amount
 */

/**
 * @typedef {Object} CreateOrderResponse
 * @property {string} result_code - Result code
 * @property {string} result_msg - Result message
 * @property {Object} biz_content - Business content
 * @property {string} biz_content.prepay_id - Prepayment ID
 * @property {string} [error_code] - Error code if order creation fails
 * @property {string} [error_msg] - Error message if order creation fails
 */

/**
 * @typedef {Object} PreOrderRequest
 * @property {string} timestamp - Request timestamp
 * @property {string} nonce_str - Nonce string for security
 * @property {string} method - API method name
 * @property {string} version - API version
 * @property {Object} biz_content - Business content
 * @property {string} sign - Request signature
 * @property {string} sign_type - Signature type
 */

/**
 * @typedef {Object} RawRequestData
 * @property {string} appid - Application ID
 * @property {string} merch_code - Merchant code
 * @property {string} nonce_str - Nonce string
 * @property {string} prepay_id - Prepayment ID
 * @property {string} timestamp - Timestamp
 * @property {string} sign - Request signature
 * @property {string} sign_type - Signature type
 */

/**
 * Logs order creation requests and responses
 * @private
 * @param {Object} requestData - Request data
 * @param {Object} responseData - Response data
 * @param {string} operation - Operation name
 * @param {number} duration - Request duration in ms
 */
const logOrderRequest = (requestData, responseData, operation, duration) => {
  const requestId = requestData && requestData.nonce_str ? requestData.nonce_str : 'unknown';
  const amount = requestData && requestData.biz_content && requestData.biz_content.total_amount 
    ? requestData.biz_content.total_amount 
    : 'unknown';
  const success = responseData && responseData.result_code === '0';

  const logData = {
    timestamp: new Date().toISOString(),
    operation: operation,
    requestId: requestId,
    amount: amount,
    duration: duration + 'ms',
    success: success,
    prepayId: responseData && responseData.biz_content ? responseData.biz_content.prepay_id : null,
  };

  console.log('[Order Service] ' + JSON.stringify(logData));
};

/**
 * Generates a unique merchant order ID
 * @private
 * @returns {string} Unique merchant order ID
 */
const generateMerchantOrderId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return 'ORDER_' + timestamp + '_' + random;
};

/**
 * Creates a signed request object for Fabric pre-order API
 * @private
 * @param {string} title - Order title
 * @param {number} amount - Order amount
 * @returns {PreOrderRequest} Signed request object
 */
const createPreOrderRequest = (title, amount) => {
  const baseRequest = {
    timestamp: tools.createTimeStamp(),
    nonce_str: tools.createNonceStr(),
    method: 'payment.preorder',
    version: '1.0',
    biz_content: {
      trade_type: 'InApp',
      appid: config.merchantAppId,
      merch_code: config.merchantCode,
      merch_order_id: generateMerchantOrderId(),
      title: title || 'Untitled Order',
      total_amount: parseFloat(amount),
      trans_currency: config.currency || 'ETB',
      timeout_express: config.orderTimeout || '120m',
      payee_identifier: config.payeeIdentifier || config.merchantCode,
      payee_identifier_type: config.payeeIdentifierType || '04',
      payee_type: config.payeeType || '5000',
    },
  };

  // Add optional fields if configured
  if (config.notifyUrl) {
    baseRequest.biz_content.notify_url = config.notifyUrl;
  }

  if (config.redirectUrl) {
    baseRequest.biz_content.redirect_url = config.redirectUrl;
  }

  const signature = tools.signRequestObject(baseRequest);
  
  return Object.assign({}, baseRequest, {
    sign: signature,
    sign_type: 'SHA256WithRSA',
  });
};

/**
 * Creates raw request string for client-side payment
 * @private
 * @param {string} prepayId - Prepayment ID from Fabric API
 * @returns {string} Raw request string for client SDK
 */
const createRawRequestString = (prepayId) => {
  const requestData = {
    appid: config.merchantAppId,
    merch_code: config.merchantCode,
    nonce_str: tools.createNonceStr(),
    prepay_id: prepayId,
    timestamp: tools.createTimeStamp(),
  };

  const signature = tools.signRequestObject(requestData);
  
  // Order parameters by ASCII code (as required by Fabric API)
  const rawRequest = [
    'appid=' + encodeURIComponent(requestData.appid),
    'merch_code=' + encodeURIComponent(requestData.merch_code),
    'nonce_str=' + encodeURIComponent(requestData.nonce_str),
    'prepay_id=' + encodeURIComponent(requestData.prepay_id),
    'timestamp=' + encodeURIComponent(requestData.timestamp),
    'sign=' + encodeURIComponent(signature),
    'sign_type=SHA256WithRSA',
  ].join('&');

  return rawRequest;
};

/**
 * Validates create order request parameters
 * @private
 * @param {CreateOrderRequest} requestBody - Request body
 * @returns {Object} Validation result with isValid flag and errors array
 */
const validateOrderRequest = (title, amount) => {
  const errors = [];
  
  if (!title || typeof title !== 'string' || title.trim() === '') {
    errors.push('Valid title is required');
  } else if (title.length > 256) {
    errors.push('Title is too long (max 256 characters)');
  }
  
  if (!amount && amount !== 0) {
    errors.push('Amount is required');
  } else {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      errors.push('Amount must be a valid number');
    } else if (parsedAmount <= 0) {
      errors.push('Amount must be greater than 0');
    } else if (parsedAmount > 1000000) { // Example limit
      errors.push('Amount exceeds maximum limit');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

/**
 * Requests order creation from Fabric API
 * @async
 * @function requestCreateOrder
 * @param {string} fabricToken - Fabric API authentication token
 * @param {string} title - Order title
 * @param {number} amount - Order amount
 * @returns {Promise<CreateOrderResponse>} Order creation result
 * @throws {Error} If API request fails
 */
exports.requestCreateOrder = async (fabricToken, title, amount) => {
  const requestObject = createPreOrderRequest(title, amount);
  const startTime = Date.now();
  
  try {
    console.log('[Order Service] Creating order:', {
      title: title,
      amount: amount,
      merchantOrderId: requestObject.biz_content.merch_order_id,
    });

    const response = await httpClient.post('/payment/v1/merchant/preOrder', requestObject, {
      headers: {
        Authorization: fabricToken,
      },
    });

    const responseData = response.data;
    const duration = Date.now() - startTime;
    
    logOrderRequest(requestObject, responseData, 'createOrder', duration);
    
    if (!responseData) {
      throw new Error('Empty response from Fabric API');
    }
    
    // Validate response structure
    if (!responseData.biz_content || !responseData.biz_content.prepay_id) {
      console.warn('[Order Service] Response missing prepay_id:', responseData);
      
      if (responseData.result_code !== '0') {
        throw new Error(`Order creation failed: ${responseData.result_msg || 'Unknown error'}`);
      }
    }
    
    console.log('[Order Service] Order created successfully:', {
      prepayId: responseData.biz_content.prepay_id,
      merchantOrderId: responseData.biz_content.merch_order_id,
    });
    
    return responseData;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    const errorData = {
      operation: 'createOrder',
      error: error.message,
      status: error.response && error.response.status,
      data: error.response && error.response.data,
      duration: duration + 'ms',
      requestId: requestObject.nonce_str,
      title: title,
      amount: amount,
    };
    
    console.error('[Order Service] Order creation failed:', errorData);
    
    // Create a user-friendly error response
    let errorMessage = 'Order creation failed';
    let errorCode = 'REQUEST_FAILED';
    
    if (error.response) {
      errorCode = error.response.status ? error.response.status.toString() : 'API_ERROR';
      if (error.response.data && error.response.data.error_msg) {
        errorMessage = error.response.data.error_msg;
      }
    }
    
    // Throw error with context
    const enhancedError = new Error(errorMessage);
    enhancedError.code = errorCode;
    enhancedError.details = errorData;
    throw enhancedError;
  }
};

/**
 * Handles order creation requests
 * @async
 * @function createOrder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<string>} Raw request string for client SDK
 * 
 * @example
 * // Request body:
 * {
 *   "title": "Monthly Subscription",
 *   "amount": 100.50
 * }
 * 
 * // Response:
 * "appid=...&merch_code=...&prepay_id=...&timestamp=...&sign=...&sign_type=SHA256WithRSA"
 */
exports.createOrder = async (req, res) => {
  const startTime = Date.now();
  const requestId = tools.createNonceStr();
  
  try {
    console.log('[Order Service] Processing order request:', {
      requestId: requestId,
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    const { title, amount } = req.body;
    
    // Validate request parameters
    const validation = validateOrderRequest(title, amount);
    if (!validation.isValid) {
      console.warn('[Order Service] Validation failed:', {
        requestId: requestId,
        errors: validation.errors,
      });
      
      return res.status(400).json({
        result_code: 'VALIDATION_ERROR',
        result_msg: 'Invalid request parameters',
        errors: validation.errors,
        timestamp: tools.createTimeStamp(),
        request_id: requestId,
      });
    }

    // Obtain Fabric API token
    console.log('[Order Service] Obtaining Fabric token...');
    const fabricTokenResult = await applyFabricTokenService();
    const fabricToken = fabricTokenResult && fabricTokenResult.token;
    
    if (!fabricToken) {
      throw new Error('Failed to obtain Fabric API token');
    }

    console.log('[Order Service] Fabric token obtained successfully');

    // Create order with Fabric API
    const createOrderResult = await exports.requestCreateOrder(fabricToken, title, amount);
    
    // Check if order creation was successful
    if (createOrderResult.result_code !== '0' || !createOrderResult.biz_content || !createOrderResult.biz_content.prepay_id) {
      console.warn('[Order Service] API returned error:', createOrderResult);
      
      return res.status(400).json({
        result_code: createOrderResult.result_code || 'ORDER_FAILED',
        result_msg: createOrderResult.result_msg || 'Order creation failed',
        error_code: createOrderResult.error_code,
        error_msg: createOrderResult.error_msg,
        timestamp: tools.createTimeStamp(),
        request_id: requestId,
      });
    }

    const prepayId = createOrderResult.biz_content.prepay_id;
    const merchantOrderId = createOrderResult.biz_content.merch_order_id;
    
    // Create raw request for client SDK
    const rawRequest = createRawRequestString(prepayId);
    
    const totalDuration = Date.now() - startTime;
    
    console.log('[Order Service] Order processed successfully:', {
      requestId: requestId,
      prepayId: prepayId,
      merchantOrderId: merchantOrderId,
      duration: totalDuration + 'ms',
    });

    // Send success response with raw request
    const response = {
      result_code: '0',
      result_msg: 'Order created successfully',
      rawRequest: rawRequest,
      prepay_id: prepayId,
      merch_order_id: merchantOrderId,
      request_id: requestId,
      timestamp: tools.createTimeStamp(),
      processed_at: new Date().toISOString(),
    };
    
    return res.json(response);
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    console.error('[Order Service] Unexpected error in createOrder:', {
      requestId: requestId,
      error: error.message,
      errorCode: error.code,
      stack: config.env === 'development' ? error.stack : undefined,
      duration: totalDuration + 'ms',
    });

    // Send error response
    const errorResponse = {
      result_code: 'INTERNAL_ERROR',
      result_msg: 'An internal server error occurred',
      error_code: error.code || 'UNKNOWN_ERROR',
      error_msg: error.message,
      timestamp: tools.createTimeStamp(),
      request_id: requestId,
    };
    
    return res.status(500).json(errorResponse);
  }
};

/**
 * Get order status (stub for future implementation)
 * @async
 * @function getOrderStatus
 * @param {string} prepayId - Prepayment ID
 * @returns {Promise<Object>} Order status
 */
exports.getOrderStatus = async (prepayId) => {
  // This is a stub for future implementation
  // In a real implementation, you would query Fabric API or your database
  console.log('[Order Service] Getting order status for prepayId:', prepayId);
  
  return {
    prepay_id: prepayId,
    status: 'pending',
    last_updated: new Date().toISOString(),
  };
};

/**
 * Validate raw request signature (stub for future implementation)
 * @function validateRawRequest
 * @param {string} rawRequest - Raw request string
 * @returns {boolean} True if signature is valid
 */
exports.validateRawRequest = (rawRequest) => {
  // This is a stub for signature validation
  // In a real implementation, you would parse and validate the signature
  console.log('[Order Service] Validating raw request');
  
  // Basic validation - check if it contains required parameters
  const requiredParams = ['appid', 'merch_code', 'prepay_id', 'timestamp', 'sign'];
  return requiredParams.every(param => rawRequest.includes(param));
};

module.exports = exports;
