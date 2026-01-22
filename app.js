/**
 * @module app
 * @description Main Express application server for Fabric Payment API
 * @version 1.0.0
 */

const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const WebSocket = require("ws");

const { signString } = require("./utils/tools");
const authToken = require("./service/authTokenService");
const createOrder = require("./service/createOrderService");
const createMandetOrder = require("./service/createMandetOrderService");

const app = express();
const server = http.createServer(app);

// =============================================
// MIDDLEWARE SETUP
// =============================================

// Body parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PATCH, PUT, DELETE"
  );
  res.header("Allow", "GET, POST, PATCH, OPTIONS, PUT, DELETE");
  
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  next();
});

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} from ${ip}`);
  
  // Log response time
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${method} ${url} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// =============================================
// HEALTH & STATUS ENDPOINTS
// =============================================

app.get("/", (req, res) => {
  res.json({
    service: "Fabric Payment API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "GET /health",
      authToken: "POST /apply/h5token",
      createOrder: "POST /create/order",
      createMandateOrder: "POST /create/mandetOrder",
      notify: "POST /api/v1/notify"
    },
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    },
    nodeVersion: process.version,
    platform: process.platform
  };
  
  res.json(health);
});

// =============================================
// API ENDPOINTS
// =============================================

// Authentication token endpoint
app.post("/apply/h5token", async (req, res) => {
  try {
    console.log("Auth token request received:", {
      timestamp: new Date().toISOString(),
      body: req.body
    });
    
    // Call the existing service
    await authToken.authToken(req, res);
  } catch (error) {
    console.error("Error in /apply/h5token:", error);
    res.status(500).json({
      error_code: "INTERNAL_ERROR",
      error_msg: "Internal server error",
      timestamp: new Date().toISOString()
    });
  }
});

// Create regular order endpoint
app.post("/create/order", async (req, res) => {
  try {
    console.log("Create order request received:", {
      timestamp: new Date().toISOString(),
      body: req.body
    });
    
    // Call the existing service
    const result = await createOrder.createOrder(req, res);
    return res.status(200).send(result);
  } catch (error) {
    console.error("Error in /create/order:", error);
    res.status(500).json({
      error_code: "INTERNAL_ERROR",
      error_msg: "Internal server error",
      timestamp: new Date().toISOString()
    });
  }
});

// Create mandate order endpoint
app.post("/create/mandetOrder", async (req, res) => {
  try {
    console.log("Create mandate order request received:", {
      timestamp: new Date().toISOString(),
      body: req.body
    });
    
    // Call the existing service
    await createMandetOrder.createMandetOrder(req, res);
  } catch (error) {
    console.error("Error in /create/mandetOrder:", error);
    res.status(500).json({
      error_code: "INTERNAL_ERROR",
      error_msg: "Internal server error",
      timestamp: new Date().toISOString()
    });
  }
});

// Notification webhook endpoint
app.post("/api/v1/notify", async (req, res) => {
  try {
    console.log("Notification received:", {
      timestamp: new Date().toISOString(),
      body: req.body,
      headers: req.headers
    });
    
    // Handle notification logic here
    // You should:
    // 1. Verify the signature
    // 2. Process the payment status
    // 3. Update your database
    // 4. Send confirmation if needed
    
    // For now, just acknowledge
    res.status(200).json({
      status: "success",
      message: "Notification received and processed",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in /api/v1/notify:", error);
    res.status(500).json({
      error_code: "INTERNAL_ERROR",
      error_msg: "Failed to process notification",
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ERROR HANDLING
// =============================================

// 404 - Route not found
app.use((req, res) => {
  res.status(404).json({
    error_code: "NOT_FOUND",
    error_msg: `Route ${req.method} ${req.url} not found`,
    available_endpoints: [
      "GET /",
      "GET /health",
      "POST /apply/h5token",
      "POST /create/order", 
      "POST /create/mandetOrder",
      "POST /api/v1/notify"
    ],
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  
  res.status(500).json({
    error_code: "SERVER_ERROR",
    error_msg: "An unexpected error occurred",
    timestamp: new Date().toISOString()
  });
});

// =============================================
// SERVER STARTUP
// =============================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
███████╗██████╗  █████╗ ██████╗ ██████╗ ██╗ ██████╗
██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██║██╔════╝
█████╗  ██████╔╝███████║██████╔╝██████╔╝██║██║     
██╔══╝  ██╔══██╗██╔══██║██╔═══╝ ██╔═══╝ ██║██║     
██║     ██║  ██║██║  ██║██║     ██║     ██║╚██████╗
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═════╝
                                                    
  Fabric Payment API Server v1.0.0
  =================================
  
  Server running on port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  
  Available Endpoints:
  -------------------
  GET  /                    - API Documentation
  GET  /health             - Health Check
  POST /apply/h5token      - Authentication Token
  POST /create/order       - Create Regular Order
  POST /create/mandetOrder - Create Mandate Order
  POST /api/v1/notify      - Payment Notification
  
  =================================
  Ready to process payments!
  `);
});

// Handle server errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log(`💡 Try running with a different port:`);
    console.log(`   PORT=3001 node app.js`);
    console.log(`   or`);
    console.log(`   kill -9 $(lsof -t -i:${PORT})`);
  } else {
    console.error("❌ Server error:", error);
  }
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error("❌ Could not close connections in time, forcing shutdown");
    process.exit(1);
  }, 10000);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down...");
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server };