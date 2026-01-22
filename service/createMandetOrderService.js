/**
 * @module controllers/mandateOrderController
 * @description Controller for creating mandate orders with Fabric API
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
 * @typedef {Object} CreateOrderRequest
 * @property {string} title - Order title/description
 * @property {number|string} amount - Order amount
 * @property {string} ContractNo - Contract number for mandate
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
 * @typedef {Object} BusinessContent
 * @property {string} notify_url - Webhook notification URL
 * @property {string} trade_type - Trade type (e.g., "InApp")
 * @property {string} appid - Merchant application ID
 * @property {string} merch_code - Merchant code
 * @property {string} merch_order_id - Merchant order ID
 * @property {string} title - Order title
 * @property {number} total_amount - Total amount
 * @property {string} trans_currency - Transaction currency
 * @property {string} timeout_express - Order timeout
 * @property {string} payee_identifier - Payee identifier
 * @property {string} payee_identifier_type - Payee identifier type
 * @property {string} payee_type - Payee type
 * @property {Object} mandate_data - Mandate data
 * @property {string} mandate_data.mctContractNo - Contract number
 * @property {string} mandate_data.mandateTemplateId - Mandate template ID
 * @property {string} mandate_data.executeTime - Mandate execution time
 * @property {string} redirect_url - Redirect URL after payment
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
 * Request logger middleware
 * @param {string} endpoint - API endpoint
 * @param {Object} requestData - Request data
 * @param {Object} responseData - Response data
 * @param {number} duration - Request duration in ms
 */
const logOrderRequest = (endpoint, requestData, responseData, duration) => {
  const requestId = requestData && requestData.nonce_str ? requestData.nonce_str : 'unknown';
  const orderId = requestData && requestData.biz_content && requestData.biz_content.merch_order_id 
    ? requestData.biz_content.merch_order_id 
    : 'unknown';
  const amount = requestData && requestData.biz_content && requestData.biz_content.total_amount 
    ? requestData.biz_content.total_amount 
    : 'unknown';
  
  const logData = {
    timestamp: new Date().toISOString(),
    endpoint: endpoint,
    requestId: requestId,
    orderId: orderId,
    amount: amount,
    duration: duration + 'ms',
    request: {
      method: requestData && requestData.method ? requestData.method : 'unknown',
      tradeType: requestData && requestData.biz_content && requestData.biz_content.trade_type 
        ? requestData.biz_content.trade_type 
        : 'unknown',
    },
    response: {
      success: responseData && responseData.result_code === '0',
      resultCode: responseData && responseData.result_code,
      hasPrepayId: responseData && responseData.biz_content && !!responseData.biz_content.prepay_id,
    },
  };

  if (config.enableDetailedLogging) {
    console.log('[Order Controller] Request completed:', JSON.stringify(logData, null, 2));
  } else {
    const status = responseData && responseData.result_code === '0' ? 'SUCCESS' : 'FAILED';
    console.log('[Order Controller] ' + endpoint + ' - ' + status + ' - ' + duration + 'ms');
  }
};

/**
 * Generates a unique merchant order ID
 * @private
 * @returns {string} Unique merchant order ID
 */
const generateMerchantOrderId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return 'ORDER_' + timestamp + '_' + random;
};

/**
 * Creates a signed request object for Fabric pre-order API
 * @private
 * @param {string} title - Order title
 * @param {number} amount - Order amount
 * @param {string} contractNo - Contract number for mandate
 * @returns {PreOrderRequest} Signed request object
 */
const createPreOrderRequest = (title, amount, contractNo) => {
  const baseRequest = {
    timestamp: tools.createTimeStamp(),
    nonce_str: tools.createNonceStr(),
    method: 'payment.preorder',
    version: '1.0',
    biz_content: {
      notify_url: config.notifyUrl || 'https://node-api-muxu.onrender.com/api/v1/notify',
      trade_type: 'InApp',
      appid: config.merchantAppId,
      merch_code: config.merchantCode,
      merch_order_id: generateMerchantOrderId(),
      title: title,
      total_amount: parseFloat(amount),
      trans_currency: config.currency || 'ETB',
      timeout_express: config.orderTimeout || '120m',
      payee_identifier: config.payeeIdentifier || '220311',
      payee_identifier_type: config.payeeIdentifierType || '04',
      payee_type: config.payeeType || '5000',
      mandate_data: {
        mctContractNo: contractNo,
        mandateTemplateId: config.mandateTemplateId || '103001',
        executeTime: config.mandateExecuteTime || new Date().toISOString().split('T')[0],
      },
      redirect_url: config.redirectUrl || 'https://node-api-muxu.onrender.com/api/v1/notify',
    },
  };

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
  
  // Order parameters by ASCII code
  const rawRequest = [
    'appid=' + requestData.appid,
    'merch_code=' + requestData.merch_code,
    'nonce_str=' + requestData.nonce_str,
    'prepay_id=' + requestData.prepay_id,
    'timestamp=' + requestData.timestamp,
    'sign=' + signature,
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
const validateCreateOrderRequest = (requestBody) => {
  const errors = [];
  
  // Check required fields
  if (!requestBody || typeof requestBody !== 'object') {
    errors.push('Request body is required');
    return { isValid: false, errors: errors };
  }
  
  if (!requestBody.title || typeof requestBody.title !== 'string' || requestBody.title.trim() === '') {
    errors.push('Valid title is required');
  }
  
  if (!requestBody.amount) {
    errors.push('Amount is required');
  } else {
    const amount = parseFloat(requestBody.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Amount must be a positive number');
    }
  }
  
  if (!requestBody.ContractNo || typeof requestBody.ContractNo !== 'string' || requestBody.ContractNo.trim() === '') {
    errors.push('Valid ContractNo is required');
  }
  
  // Additional validation
  if (requestBody.title && requestBody.title.length > 256) {
    errors.push('Title is too long (max 256 characters)');
  }
  
  if (requestBody.ContractNo && requestBody.ContractNo.length > 100) {
    errors.push('ContractNo is too long (max 100 characters)');
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
 * @param {string} contractNo - Contract number for mandate
 * @returns {Promise<CreateOrderResponse>} Order creation result
 * @throws {Error} If API request fails
 */
exports.requestCreateOrder = async (fabricToken, title, amount, contractNo) => {
  const requestObject = createPreOrderRequest(title, amount, contractNo);
  const startTime = Date.now();
  
  try {
    const response = await httpClient.post('/payment/v1/merchant/preOrder', requestObject, {
      headers: {
        Authorization: fabricToken,
      },
    });

    const responseData = response.data;
    const duration = Date.now() - startTime;
    
    logOrderRequest('/payment/v1/merchant/preOrder', requestObject, responseData, duration);
    
    if (!responseData) {
      throw new Error('Empty response from Fabric API');
    }
    
    // Validate response structure
    if (!responseData.biz_content || !responseData.biz_content.prepay_id) {
      console.warn('[Order Controller] Response missing prepay_id:', responseData);
    }
    
    return responseData;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('[Order Controller] Order creation failed:', {
      error: error.message,
      status: error.response && error.response.status,
      data: error.response && error.response.data,
      duration: duration + 'ms',
      requestId: requestObject.nonce_str,
      orderTitle: title,
      amount: amount,
    });
    
    // Return a structured error response
    return {
      result_code: 'ERROR',
      result_msg: 'Order creation failed',
      error_code: error.response && error.response.status ? error.response.status.toString() : 'REQUEST_FAILED',
      error_msg: error.response && error.response.data && error.response.data.error_msg 
        ? error.response.data.error_msg 
        : error.message,
      timestamp: tools.createTimeStamp(),
    };
  }
};

/**
 * Handles mandate order creation requests
 * @async
 * @function createMandateOrder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @example
 * // Request body:
 * {
 *   "title": "Monthly Subscription",
 *   "amount": 100.50,
 *   "ContractNo": "CONTRACT_123456"
 * }
 * 
 * // Successful response:
 * {
 *   "rawRequest": "appid=...&merch_code=...&...",
 *   "prepay_id": "prepay_123456",
 *   "merch_order_id": "ORDER_1625097600_123"
 * }
 */
exports.createMandateOrder = async (req, res) => {
  const requestId = tools.createNonceStr();
  const startTime = Date.now();
  
  try {
    // Validate request
    const validation = validateCreateOrderRequest(req.body);
    if (!validation.isValid) {
      console.warn('[Order Controller] Validation failed for request ' + requestId + ':', validation.errors);
      
      return res.status(400).json({
        result_code: 'VALIDATION_ERROR',
        result_msg: 'Invalid request parameters',
        errors: validation.errors,
        timestamp: tools.createTimeStamp(),
        request_id: requestId,
      });
    }

    const { title, amount, ContractNo } = req.body;
    
    // Log request
    console.log('[Order Controller] Creating mandate order', {
      requestId: requestId,
      title: title,
      amount: amount,
      contractNo: ContractNo,
      timestamp: new Date().toISOString(),
    });

    // Obtain Fabric API token
    const fabricTokenResult = await applyFabricTokenService();
    const fabricToken = fabricTokenResult && fabricTokenResult.token;
    
    if (!fabricToken) {
      throw new Error('Failed to obtain Fabric API token');
    }

    // Create order with Fabric API
    const createOrderResult = await exports.requestCreateOrder(fabricToken, title, amount, ContractNo);
    const totalDuration = Date.now() - startTime;
    
    // Check if order creation was successful
    if (createOrderResult.result_code !== '0' || !createOrderResult.biz_content || !createOrderResult.biz_content.prepay_id) {
      console.warn('[Order Controller] Order creation failed', {
        requestId: requestId,
        resultCode: createOrderResult.result_code,
        resultMsg: createOrderResult.result_msg,
        duration: totalDuration + 'ms',
      });
      
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
    const merchOrderId = createOrderResult.biz_content.merch_order_id;
    
    // Create raw request for client SDK
    const rawRequest = createRawRequestString(prepayId);
    
    // Log successful order creation
    console.log('[Order Controller] Order created successfully', {
      requestId: requestId,
      prepayId: prepayId,
      merchOrderId: merchOrderId,
      duration: totalDuration + 'ms',
    });

    // Send success response
    const response = {
      result_code: '0',
      result_msg: 'Order created successfully',
      rawRequest: rawRequest,
      prepay_id: prepayId,
      merch_order_id: merchOrderId,
      request_id: requestId,
      timestamp: tools.createTimeStamp(),
      processed_at: new Date().toISOString(),
    };
    
    return res.json(response);
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    console.error('[Order Controller] Unexpected error in createMandateOrder endpoint', {
      requestId: requestId,
      error: error.message,
      stack: config.env === 'development' ? error.stack : undefined,
      duration: totalDuration + 'ms',
    });

    return res.status(500).json({
      result_code: 'INTERNAL_ERROR',
      result_msg: 'An internal server error occurred',
      timestamp: tools.createTimeStamp(),
      request_id: requestId,
    });
  }
};

/**
 * Get order details (mock/stub for future implementation)
 * @function getOrderDetails
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    
    // In a real implementation, you would fetch from database
    // This is a stub for future implementation
    
    res.json({
      result_code: '0',
      result_msg: 'Order details retrieved',
      order_id: orderId,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Order Controller] Error fetching order details:', error.message);
    res.status(500).json({
      result_code: 'ERROR',
      result_msg: 'Failed to fetch order details',
      timestamp: tools.createTimeStamp(),
    });
  }
};

/**
 * Cancel order (mock/stub for future implementation)
 * @function cancelOrder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    
    // In a real implementation, you would update order status in database
    // and possibly call Fabric API to cancel
    
    res.json({
      result_code: '0',
      result_msg: 'Order cancelled successfully',
      order_id: orderId,
      cancelled_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Order Controller] Error cancelling order:', error.message);
    res.status(500).json({
      result_code: 'ERROR',
      result_msg: 'Failed to cancel order',
      timestamp: tools.createTimeStamp(),
    });
  }
};