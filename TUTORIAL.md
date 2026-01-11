# JWT Payment Flow Tutorial

A secure payment flow implementation using JSON Web Tokens with both **JWS (JSON Web Signature)** for authentication and **JWE (JSON Web Encryption)** for payload protection.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Security Model](#security-model)
4. [Project Structure](#project-structure)
5. [Key Concepts](#key-concepts)
6. [Step-by-Step Flow](#step-by-step-flow)
7. [Code Walkthrough](#code-walkthrough)
8. [Running the Project](#running-the-project)
9. [Testing](#testing)

---

## Overview

This project demonstrates a production-grade pattern for securing API communications between a web client and server using JWT technologies:

- **JWS (RS256)**: Server-issued authentication tokens
- **JWE (RSA-OAEP-256 + A256GCM)**: Client-encrypted payloads

This dual-token approach provides both **authentication** (proving who you are) and **confidentiality** (protecting sensitive data in transit).

---

## Architecture

```
┌─────────────────┐                           ┌─────────────────┐
│                 │                           │                 │
│     CLIENT      │                           │     SERVER      │
│    (Browser)    │                           │   (Express)     │
│                 │                           │                 │
└────────┬────────┘                           └────────┬────────┘
         │                                             │
         │  1. POST /api/auth                          │
         │     { clientId: "..." }                     │
         │ ──────────────────────────────────────────► │
         │                                             │
         │  2. JWS Token (signed with AUTH_PRIVATE_KEY)│
         │ ◄────────────────────────────────────────── │
         │                                             │
         │  3. Encrypt payload with ENCRYPT_PUBLIC_KEY │
         │     (creates JWE)                           │
         │                                             │
         │  4. POST /api/payment                       │
         │     Authorization: Bearer <JWS>             │
         │     { payload_jwe: "<JWE>" }                │
         │ ──────────────────────────────────────────► │
         │                                             │
         │                    5. Verify JWS with AUTH_PUBLIC_KEY
         │                    6. Decrypt JWE with ENCRYPT_PRIVATE_KEY
         │                                             │
         │  7. Payment Result                          │
         │ ◄────────────────────────────────────────── │
         │                                             │
```

---

## Security Model

### Two Key Pairs, Two Purposes

| Key Pair | Purpose | Who Holds Private Key | Who Holds Public Key |
|----------|---------|----------------------|---------------------|
| **AUTH_*** | Sign/verify auth tokens | Server | Server (client doesn't need it) |
| **ENCRYPT_*** | Encrypt/decrypt payloads | Server | Client |

### Why This Pattern?

1. **Authentication (JWS)**
   - Server issues short-lived tokens (5 minutes)
   - Server signs with private key → only server can issue valid tokens
   - Server verifies with public key → confirms token authenticity

2. **Confidentiality (JWE)**
   - Client encrypts with server's public key
   - Only server can decrypt with private key
   - Even if intercepted, payload cannot be read

3. **Defense in Depth**
   - HTTPS protects transport layer
   - JWS prevents token forgery
   - JWE protects sensitive data even from compromised intermediaries

---

## Project Structure

```
jwt-payment-flow/
├── .env                      # RSA key pairs (base64 encoded)
├── package.json              # Root package with npm-run-all2
├── test-flow.js              # End-to-end test script
├── README.md                 # Quick start and configuration
├── TUTORIAL.md               # This file
│
├── docs/
│   └── SYSTEM_DESIGN.md      # Detailed architecture documentation
│
├── client/                   # Vite vanilla JS application
│   ├── package.json
│   ├── vite.config.js        # Exposes ENCRYPT_PUBLIC_KEY
│   ├── index.html
│   └── src/
│       ├── main.js           # Entry point
│       ├── PaymentForm.js    # UI component with theming
│       ├── api.js            # API client (auth + payment)
│       ├── jwt.js            # JWE encryption
│       ├── validators.js     # Input formatting & validation
│       ├── validators.test.js# Validator unit tests
│       └── style.css         # Styles with theme support
│
└── server/                   # Express API server
    ├── package.json
    ├── vitest.config.js      # Test configuration
    ├── vitest.setup.js       # Test setup (env loading)
    └── src/
        ├── index.js          # Entry point, starts server
        ├── app.js            # Express routes (extracted for testing)
        ├── jwt.js            # JWS signing/verification, JWE decryption
        ├── jwt.test.js       # JWT utility unit tests
        └── api.test.js       # API endpoint tests
```

---

## Key Concepts

### JWS (JSON Web Signature)

A JWS token has three parts separated by dots:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6InRlc3QifQ.signature
└──────────── Header ────────────┘.└──────── Payload ──────┘.└─ Signature ─┘
```

- **Header**: Algorithm (RS256) and type (JWT)
- **Payload**: Claims (clientId, expiration, issuer)
- **Signature**: Created with private key, verified with public key

### JWE (JSON Web Encryption)

A JWE token has five parts:

```
eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0.encrypted_key.iv.ciphertext.tag
└──────────────── Header ─────────────────────┘
```

- **Header**: Key encryption (RSA-OAEP-256) and content encryption (A256GCM)
- **Encrypted Key**: Symmetric key encrypted with RSA public key
- **IV**: Initialization vector for AES-GCM
- **Ciphertext**: Encrypted payload
- **Tag**: Authentication tag for integrity

### RSA Key Pairs

Generated using OpenSSL:

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem
```

Keys are stored base64-encoded in `.env` for easy handling.

---

## Step-by-Step Flow

### Step 1: Client Requests Authentication

```javascript
// client/src/api.js
const response = await fetch(`${API_URL}/api/auth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clientId: 'web-client-123' })
});
```

### Step 2: Server Issues JWS Token

```javascript
// server/src/jwt.js
export async function issueAuthToken(claims) {
  const privateKey = await getAuthPrivateKey();

  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .setIssuer('jwt-payment-server')
    .sign(privateKey);

  return token;
}
```

### Step 3: Client Encrypts Payment Payload

```javascript
// client/src/jwt.js
export async function encryptPayload(payload) {
  const publicKey = await getEncryptPublicKey();
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  const jwe = await new CompactEncrypt(plaintext)
    .setProtectedHeader({
      alg: 'RSA-OAEP-256',  // Key encryption algorithm
      enc: 'A256GCM'        // Content encryption algorithm
    })
    .encrypt(publicKey);

  return jwe;
}
```

### Step 4: Client Submits Payment

```javascript
// client/src/api.js
const response = await fetch(`${API_URL}/api/payment`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`  // JWS token
  },
  body: JSON.stringify({ payload_jwe })     // Encrypted payload
});
```

### Step 5: Server Verifies Authentication

```javascript
// server/src/jwt.js
export async function verifyAuthToken(token) {
  const publicKey = await getAuthPublicKey();

  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'jwt-payment-server'
  });

  return payload;
}
```

### Step 6: Server Decrypts Payload

```javascript
// server/src/jwt.js
export async function decryptPayload(jwe) {
  const privateKey = await getEncryptPrivateKey();

  const { plaintext } = await compactDecrypt(jwe, privateKey);
  const payload = JSON.parse(new TextDecoder().decode(plaintext));

  return payload;
}
```

---

## Code Walkthrough

### Environment Configuration (.env)

```bash
# Auth Token Keys (RS256 for JWS signing)
AUTH_PRIVATE_KEY=<base64 encoded PEM>   # Server signs tokens
AUTH_PUBLIC_KEY=<base64 encoded PEM>    # Server verifies tokens

# Encryption Keys (RSA-OAEP for JWE)
ENCRYPT_PRIVATE_KEY=<base64 encoded PEM> # Server decrypts payloads
ENCRYPT_PUBLIC_KEY=<base64 encoded PEM>  # Client encrypts payloads

# Server config
SERVER_PORT=3001
```

### Server Application (app.js)

The Express routes are defined in `app.js` and exported for testing:

```javascript
// server/src/app.js
import cors from 'cors';
import express from 'express';
import { decryptPayload, issueAuthToken, verifyAuthToken } from './jwt.js';

const app = express();
app.use(cors());
app.use(express.json());

// Auth endpoint - issues JWS token
app.post('/api/auth', async (req, res) => {
  const { clientId } = req.body;

  if (!clientId) {
    return res.status(400).json({
      success: false,
      error: 'clientId is required'
    });
  }

  const token = await issueAuthToken({ clientId });

  res.json({
    success: true,
    token,
    expiresIn: 300  // 5 minutes
  });
});

// Payment endpoint - verifies auth, decrypts payload
app.post('/api/payment', async (req, res) => {
  // 1. Extract and verify auth token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization header required'
    });
  }

  const authToken = authHeader.substring(7);
  const authPayload = await verifyAuthToken(authToken);

  // 2. Decrypt the JWE payload
  const { payload_jwe } = req.body;
  if (!payload_jwe) {
    return res.status(400).json({
      success: false,
      error: 'payload_jwe is required'
    });
  }

  const paymentData = await decryptPayload(payload_jwe);

  // 3. Process payment
  const result = {
    success: true,
    message: 'Payment processed successfully',
    transactionId: crypto.randomUUID(),
    amount: paymentData.amount,
    clientId: authPayload.clientId,
    timestamp: new Date().toISOString()
  };

  res.json(result);
});

export default app;
```

### Client Payment Form Component

The PaymentForm component supports theming and configuration:

```javascript
// client/src/PaymentForm.js
export function PaymentForm(onSubmit, amount, config = {}) {
  const {
    theme = '',        // 'dark', 'light', or 'minimal'
    className = '',
    styles = {},       // CSS custom property overrides
    labels = {},       // Custom label text
    placeholders = {}  // Custom placeholder text
  } = config;

  const form = document.createElement('form');
  form.className = ['payment-form', theme, className].filter(Boolean).join(' ');

  // Apply custom styles via CSS custom properties
  Object.entries(styles).forEach(([prop, value]) => {
    form.style.setProperty(`--pf-${prop}`, value);
  });

  // ... form HTML with merged labels and placeholders ...

  async function handleSubmit(e) {
    e.preventDefault();
    clearAllErrors();

    // Validate all fields
    const cardNumberError = validateCardNumber(cardNumber);
    if (cardNumberError.valid !== true) {
      showError(cardNumberInput, cardNumberError.message);
      hasErrors = true;
    }
    // ... more validation ...

    if (hasErrors) return;

    const paymentData = {
      cardNumber,
      expirationDate,
      cvv,
      postalCode,
      amount: parseFloat(formData.get('amount'))
    };

    const result = await onSubmit(paymentData);
    // Display result...
  }

  form.addEventListener('submit', handleSubmit);
  return form;
}
```

### Client Input Validation

The validators module provides formatting and validation:

```javascript
// client/src/validators.js

// Format card number with spaces: "4111111111111111" -> "4111 1111 1111 1111"
export function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(' ').substring(0, 19);
}

// Validate card number using Luhn algorithm
export function validateCardNumber(cardNumber) {
  const cleaned = cardNumber.replace(/\s/g, '');

  if (!/^\d{13,19}$/.test(cleaned)) {
    return { valid: false, message: 'Card number must be 13-19 digits' };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  const valid = sum % 10 === 0;
  return { valid, message: valid ? '' : 'Invalid card number' };
}
```

### Client API Module

```javascript
// client/src/api.js
let authToken = null;

export async function submitPayment(paymentData) {
  // 1. Get auth token if needed
  if (!authToken) {
    await getAuthToken('web-client-' + Date.now());
  }

  // 2. Encrypt payload as JWE
  const payload_jwe = await encryptPayload(paymentData);

  // 3. Submit with auth + encrypted payload
  const response = await fetch(`${API_URL}/api/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ payload_jwe })
  });

  const result = await response.json();

  // Clear token on auth failure for retry
  if (response.status === 401) {
    authToken = null;
    throw new Error(result.error || 'Authentication failed');
  }

  return result;
}
```

---

## Running the Project

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### Development

```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Start client
cd client && npm run dev
```

This starts:
- **Client**: http://localhost:5173 (Vite dev server)
- **Server**: http://localhost:3001 (Express API)

---

## Testing

### Unit Tests

Both client and server include comprehensive unit tests using Vitest.

**Client tests:**
```bash
cd client && npm test
```

Tests the validators module:
- Input formatting functions (card number, expiration, CVV, postal code)
- Luhn algorithm validation
- Date expiration logic
- Edge cases

**Server tests:**
```bash
cd server && npm test
```

Tests include:
- **JWT utilities**: Token issuance, verification, expiration, tampering detection
- **API endpoints**: Auth and payment validation, error handling
- **Integration**: Full auth → payment flow

### End-to-End Test

```bash
# Start the server first
cd server && npm run dev

# In another terminal, run the test
node test-flow.js
```

### Expected Output

```
=== JWT Payment Flow Test ===

1. Requesting auth token (JWS RS256)...
   Auth token received: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
   Expires in: 300 seconds

2. Encrypting payment payload (JWE RSA-OAEP-256)...
   JWE created: eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0...

3. Submitting payment...
   - Authorization: Bearer <JWS token>
   - Body: { payload_jwe: "<JWE encrypted payload>" }

4. Server Response:
{
  "success": true,
  "message": "Payment processed successfully",
  "transactionId": "73ea5219-1f85-422d-8b64-16c0add2074c",
  "amount": 99.99,
  "clientId": "test-client-001",
  "timestamp": "2026-01-09T19:06:13.207Z"
}

✓ Payment flow completed successfully!
```

### Manual Testing with cURL

```bash
# 1. Get auth token
curl -X POST http://localhost:3001/api/auth \
  -H "Content-Type: application/json" \
  -d '{"clientId": "curl-test"}'

# Response: {"success":true,"token":"eyJhbG...","expiresIn":300}
```

---

## Summary

This project demonstrates:

1. **Separation of concerns**: Authentication (JWS) vs encryption (JWE)
2. **Asymmetric cryptography**: Public/private key pairs for security
3. **Short-lived tokens**: 5-minute expiration reduces risk
4. **Testable architecture**: Express app extracted for unit testing
5. **Input validation**: Luhn algorithm and formatting on client
6. **Theming support**: Configurable payment form appearance
7. **Environment-based secrets**: Keys loaded from `.env`
8. **Modern JavaScript**: ES modules, async/await, jose library

The pattern is suitable for any scenario requiring both authenticated and encrypted API communication.
