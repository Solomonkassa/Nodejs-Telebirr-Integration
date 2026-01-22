# Fabric Payment API - Node.js Backend

A professional Node.js backend service for processing payments through the Fabric Payment Gateway (Ethio Telecom's e-birr system).

## 📋 Table of Contents
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Environment Variables](#environment-variables)
- [Security](#security)
- [Error Handling](#error-handling)
- [Logging](#logging)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## ✨ Features

- **Payment Processing**: Handle regular and mandate-based payments
- **Authentication**: Token verification and management
- **Security**: RSA signature generation/verification, rate limiting
- **Professional Structure**: Modular, well-documented codebase
- **Error Handling**: Comprehensive error management with logging
- **Scalability**: Ready for production deployment

## 📁 Project Structure

```
back/
├── config/
│   └── config.js          # Application configuration
├── controllers/
│   ├── authController.js   # Authentication controller
│   ├── orderController.js  # Order management controller
│   └── mandateOrderController.js # Mandate orders controller
├── services/
│   ├── applyFabricTokenService.js  # Fabric token service
│   ├── authTokenService.js         # Authentication service
│   ├── createOrderService.js       # Regular order service
│   └── createMandetOrderService.js # Mandate order service
├── utils/
│   ├── tools.js           # Cryptographic utilities
│   └── sign-util-lib/     # External signing library
├── app.js                 # Main application entry point
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variables template
└── README.md            # This file
```

## 🚀 Quick Start

### Clone the Repository
```bash
git clone https://github.com/Solomonkassa/Nodejs-Telebirr-Integration.git
cd Nodejs-Telebirr-Integration/back
```

### Installation Steps
1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update configuration in `.env` file with your credentials

4. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## ⚙️ Configuration

### Configuration Files

1. **`.env`** - Environment variables (copy from `.env.example`)
2. **`config/config.js`** - Main configuration with defaults

### Key Configuration Options

```javascript
// config/config.js
module.exports = {
  baseUrl: 'https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway',
  fabricAppId: 'your-fabric-app-id',
  appSecret: 'your-app-secret',
  merchantAppId: 'your-merchant-app-id',
  merchantCode: 'your-merchant-code',
  privateKey: '-----BEGIN PRIVATE KEY-----\n...', // Your RSA private key
  apiTimeout: 30000,
  env: 'development',
  enableDebugLogging: true
};
```

## 🔌 API Endpoints

### Authentication
- `POST /apply/h5token` - Verify authentication token
- `POST /api/v1/auth/token` - New authentication endpoint

### Orders
- `POST /create/order` - Create regular payment order
- `POST /create/mandetOrder` - Create mandate payment order
- `POST /api/v1/orders/create` - New regular order endpoint
- `POST /api/v1/orders/mandate` - New mandate order endpoint

### Utility
- `GET /health` - Health check endpoint
- `GET /` - API documentation
- `POST /api/v1/notify` - Payment notification webhook

## 📝 Usage Examples

### Using cURL

```bash
# Health check
curl http://localhost:3000/health

# Authentication
curl -X POST http://localhost:3000/apply/h5token \
  -H "Content-Type: application/json" \
  -d '{"authToken": "your_auth_token"}'

# Create order
curl -X POST http://localhost:3000/create/order \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Monthly Subscription",
    "amount": 100.50
  }'

# Create mandate order
curl -X POST http://localhost:3000/create/mandetOrder \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Monthly Subscription",
    "amount": 100.50,
    "ContractNo": "CONTRACT_123456"
  }'
```

### Using JavaScript (Frontend)

```javascript
// Authentication
fetch('/apply/h5token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ authToken: 'your_token' })
})
.then(response => response.json())
.then(data => console.log(data));

// Create order
fetch('/create/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Product Purchase',
    amount: 150.75
  })
})
.then(response => response.json())
.then(data => {
  // Use rawRequest for client-side payment initiation
  console.log(data.rawRequest);
});
```

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```bash
# API Configuration
FABRIC_BASE_URL=https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway
FABRIC_APP_ID=7ca6ef17-df90-45a9-a589-62ea3d94d3fb
FABRIC_APP_SECRET=aae8a4cc8044212577ae5edf0f0a74d9
MERCHANT_APP_ID=1184379249100809
MERCHANT_CODE=735013

# Security
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# Application Settings
NODE_ENV=development
ENABLE_DEBUG_LOGGING=true
API_TIMEOUT=30000
CURRENCY=ETB
ORDER_TIMEOUT=120m

# Payee Information
PAYEE_IDENTIFIER=220311
PAYEE_IDENTIFIER_TYPE=04
PAYEE_TYPE=5000

# URLs
NOTIFY_URL=https://your-domain.com/api/v1/notify
REDIRECT_URL=https://your-domain.com/redirect

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Security Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🛡️ Security

### Security Features
- **RSA Signing**: All requests are signed with RSA private key
- **Rate Limiting**: Prevents abuse with request limits
- **CORS Protection**: Configurable allowed origins
- **Input Validation**: All inputs are validated before processing
- **Secure Logging**: Sensitive data is masked in logs
- **HTTPS Support**: Built-in HTTPS configuration

### RSA Key Setup
1. Generate RSA key pair:
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

2. Copy private key to `.env`:
```bash
PRIVATE_KEY=$(cat private.pem)
```

## 🐛 Error Handling

The API provides consistent error responses:

```json
{
  "error_code": "VALIDATION_ERROR",
  "error_msg": "Invalid request parameters",
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "abc123xyz"
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `AUTH_ERROR` - Authentication failed
- `API_ERROR` - Fabric API error
- `INTERNAL_ERROR` - Server internal error
- `NOT_FOUND` - Route not found

## 📊 Logging

### Log Levels
- **Development**: Detailed debugging logs
- **Production**: Essential logs only

### Log Format
```
[2024-01-15T10:30:00.000Z] abc123 POST /create/order 200 150ms
```

## 🧪 Testing

### Available Scripts

```bash
# Start server
npm start

# Development mode with auto-restart
npm run dev

# Run tests (if available)
npm test

# Security audit
npm audit

# Fix security issues
npm audit fix
```

### Manual Testing
1. Start the server: `npm start`
2. Test health endpoint: `curl http://localhost:3000/health`
3. Use the test form: Visit `http://localhost:3000/api/v1/orders/test/form`

## 🚢 Deployment

### Deployment Options

#### 1. Traditional Server
```bash
# Install dependencies
npm install --production

# Set environment
export NODE_ENV=production

# Start server
npm start
```

#### 2. Docker
```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

#### 3. PM2 (Production Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start app.js --name fabric-api

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up HTTPS certificates
- [ ] Configure proper logging
- [ ] Set up monitoring/alerting
- [ ] Configure backup for private key
- [ ] Set up rate limiting appropriate for production

## 🔧 Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors
```bash
# Install missing dependencies
npm install

# Clear npm cache
npm cache clean --force
```

#### 2. Port already in use
```bash
# Change port
PORT=3001 node app.js

# Or kill existing process
kill -9 $(lsof -t -i:3000)
```

#### 3. RSA signature errors
- Verify private key format (PEM format required)
- Check that private key is properly set in `.env`
- Ensure no extra whitespace in key

#### 4. Fabric API connection issues
- Verify base URL is correct
- Check network connectivity to Fabric API
- Verify API credentials are valid

### Debug Mode
Enable debug logging in `.env`:
```bash
ENABLE_DEBUG_LOGGING=true
NODE_ENV=development
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
1. Fork the repository:
   ```bash
   git clone https://github.com/Solomonkassa/Nodejs-Telebirr-Integration.git
   ```

2. Create feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```

3. Make your changes and test thoroughly

4. Commit changes:
   ```bash
   git commit -am 'Add some feature'
   ```

5. Push to branch:
   ```bash
   git push origin feature/your-feature
   ```

6. Submit pull request

### Code Standards
- Follow existing code style
- Add JSDoc comments for new functions
- Write tests for new features
- Update documentation accordingly

### Reporting Issues
If you find a bug or have a feature request, please open an issue on [GitHub Issues](https://github.com/Solomonkassa/Nodejs-Telebirr-Integration/issues).

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support:
1. Check the troubleshooting section
2. Review the configuration documentation
3. Contact system administrator
4. Refer to Fabric API documentation

## 🌟 Acknowledgments

- [Solomon Kassa](https://github.com/Solomonkassa) - Project maintainer
- Ethio Telecom for the Fabric Payment Gateway API
- Contributors and users of this integration

---

**Note**: This system integrates with Ethio Telecom's Fabric Payment Gateway. Ensure compliance with their API documentation and terms of service.

**Repository**: [https://github.com/Solomonkassa/Nodejs-Telebirr-Integration](https://github.com/Solomonkassa/Nodejs-Telebirr-Integration)
