# JWT Payment Flow - System Design

## Overview

This application implements a secure payment processing system using JSON Web Tokens (JWT) for authentication and encryption. The architecture employs a dual-token approach with JWS (JSON Web Signature) for authentication and JWE (JSON Web Encryption) for payload protection.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │  PaymentForm.js │───▶│     api.js      │───▶│     jwt.js      │         │
│  │  (UI Component) │    │  (API Client)   │    │ (JWE Encryption)│         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                     │                      │                    │
│           ▼                     ▼                      ▼                    │
│  ┌─────────────────┐    Uses ENCRYPT_PUBLIC_KEY    Creates JWE              │
│  │  validators.js  │    for payload encryption     RSA-OAEP-256             │
│  │ (Input Format & │                                                        │
│  │   Validation)   │                                                        │
│  └─────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │         HTTPS/REST            │
                    │                               │
                    ▼                               ▼
         ┌──────────────────┐           ┌──────────────────┐
         │  POST /api/auth  │           │ POST /api/payment│
         │                  │           │                  │
         │ Request:         │           │ Request:         │
         │ { clientId }     │           │ Authorization:   │
         │                  │           │   Bearer <JWS>   │
         │ Response:        │           │ Body:            │
         │ { token (JWS),   │           │ { payload_jwe }  │
         │   expiresIn }    │           │                  │
         └──────────────────┘           └──────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER (Node.js/Express)                        │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │    index.js     │───▶│     app.js      │───▶│     jwt.js      │         │
│  │  (Entry Point)  │    │ (Express Routes)│    │ (JWT Utilities) │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                │                       │                    │
│                                ▼                       ▼                    │
│                         ┌─────────────┐    ┌─────────────────────┐         │
│                         │ /api/auth   │    │ issueAuthToken()    │         │
│                         │ /api/payment│    │ verifyAuthToken()   │         │
│                         └─────────────┘    │ decryptPayload()    │         │
│                                            └─────────────────────┘         │
│                                                                              │
│  Key Usage:                                                                  │
│  • AUTH_PRIVATE_KEY   - Signs JWS tokens (RS256)                            │
│  • AUTH_PUBLIC_KEY    - Verifies JWS tokens                                 │
│  • ENCRYPT_PRIVATE_KEY - Decrypts JWE payloads (RSA-OAEP-256)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Security Model

### Authentication Layer (JWS RS256)

The system uses asymmetric RSA keys for authentication tokens:

| Component | Key Used | Purpose |
|-----------|----------|---------|
| Server | AUTH_PRIVATE_KEY | Signs authentication tokens |
| Server | AUTH_PUBLIC_KEY | Verifies incoming tokens |

**Token Properties:**
- Algorithm: RS256 (RSA Signature with SHA-256)
- Expiration: 5 minutes
- Issuer: `jwt-payment-server`
- Claims: `clientId`, `iat`, `exp`, `iss`

### Encryption Layer (JWE RSA-OAEP-256)

Payment data is encrypted client-side before transmission:

| Component | Key Used | Purpose |
|-----------|----------|---------|
| Client | ENCRYPT_PUBLIC_KEY | Encrypts payment payload |
| Server | ENCRYPT_PRIVATE_KEY | Decrypts payment payload |

**Encryption Properties:**
- Key Algorithm: RSA-OAEP-256
- Content Encryption: A256GCM (AES-256-GCM)
- Format: JWE Compact Serialization

### Payment Flow Sequence

```
Client                                          Server
  │                                               │
  │ 1. POST /api/auth { clientId }               │
  │──────────────────────────────────────────────▶│
  │                                               │ Sign with AUTH_PRIVATE_KEY
  │         { token: <JWS>, expiresIn: 300 }     │
  │◀──────────────────────────────────────────────│
  │                                               │
  │ 2. Encrypt payment data with ENCRYPT_PUBLIC_KEY
  │    (Creates JWE)                              │
  │                                               │
  │ 3. POST /api/payment                         │
  │    Authorization: Bearer <JWS>               │
  │    Body: { payload_jwe: <JWE> }              │
  │──────────────────────────────────────────────▶│
  │                                               │ Verify JWS with AUTH_PUBLIC_KEY
  │                                               │ Decrypt JWE with ENCRYPT_PRIVATE_KEY
  │                                               │ Process payment
  │         { success, transactionId, ... }      │
  │◀──────────────────────────────────────────────│
```

---

## Server Architecture

### Directory Structure

```
server/
├── src/
│   ├── index.js       # Entry point, loads env, starts server
│   ├── app.js         # Express application and routes
│   ├── jwt.js         # JWT utilities (sign, verify, decrypt)
│   ├── jwt.test.js    # JWT utility tests
│   └── api.test.js    # API endpoint tests
├── vitest.config.js   # Test configuration
├── vitest.setup.js    # Test setup (env loading)
└── package.json
```

### Module Responsibilities

#### `index.js` - Entry Point

Responsible for:
- Loading environment variables from `.env`
- Importing the Express application
- Starting the HTTP server on configured port

```javascript
// Environment setup must happen before app import
dotenv.config({ path: resolve(__dirname, '../../.env') });
import app from './app.js';
app.listen(PORT, () => { ... });
```

#### `app.js` - Express Application

Defines the REST API routes:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth` | POST | Issue authentication token |
| `/api/payment` | POST | Process encrypted payment |

**Middleware:**
- `cors()` - Enable cross-origin requests
- `express.json()` - Parse JSON request bodies

#### `jwt.js` - JWT Utilities

| Function | Purpose | Keys Used |
|----------|---------|-----------|
| `issueAuthToken(claims)` | Create signed JWS token | AUTH_PRIVATE_KEY |
| `verifyAuthToken(token)` | Validate JWS token | AUTH_PUBLIC_KEY |
| `decryptPayload(jwe)` | Decrypt JWE payload | ENCRYPT_PRIVATE_KEY |

**Key Loading:**
- Keys are stored as base64-encoded PEM in environment variables
- Decoded at runtime using `importPKCS8` / `importSPKI` from `jose` library

### API Endpoints

#### POST `/api/auth`

Issues a short-lived authentication token.

**Request:**
```json
{
  "clientId": "web-client-123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 300
}
```

**Error Responses:**
- `400` - Missing clientId
- `500` - Token signing failure

#### POST `/api/payment`

Processes an encrypted payment.

**Request:**
```
Headers:
  Authorization: Bearer <JWS token>
  Content-Type: application/json

Body:
{
  "payload_jwe": "eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "transactionId": "uuid-v4",
  "amount": 99.99,
  "clientId": "web-client-123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Missing payload_jwe
- `401` - Missing/invalid/expired authorization token
- `500` - Decryption or processing failure

### Testing

The server includes comprehensive tests using Vitest:

**JWT Utility Tests (`jwt.test.js`):**
- Token issuance and verification
- Expiration handling
- Tamper detection
- JWE encryption/decryption
- Missing environment variable errors

**API Endpoint Tests (`api.test.js`):**
- Auth endpoint validation
- Payment authorization flows
- Payload validation
- Integration tests (full auth → payment flow)

**Run tests:**
```bash
cd server && npm test
```

---

## Client Architecture

### Directory Structure

```
client/
├── src/
│   ├── main.js           # Application entry point
│   ├── PaymentForm.js    # Payment form UI component
│   ├── api.js            # API client (auth, payment submission)
│   ├── jwt.js            # JWE encryption utility
│   ├── validators.js     # Input formatting and validation
│   ├── validators.test.js# Validation tests
│   └── style.css         # Form styles with theming
├── index.html            # HTML entry point
├── vite.config.js        # Vite build configuration
└── package.json
```

### Module Responsibilities

#### `main.js` - Entry Point

Initializes the payment form widget:
```javascript
const paymentForm = PaymentForm(submitPayment, 99.99, {
  // Optional configuration
  theme: 'light',
  styles: { primary: '#10b981' },
  labels: { legend: 'Secure Checkout' }
});
app.appendChild(paymentForm);
```

#### `PaymentForm.js` - UI Component

A configurable payment form component that:
- Renders form fields (card number, expiration, CVV, postal code)
- Handles real-time input formatting
- Validates all fields before submission
- Displays success/error states
- Supports theming and customization

**Configuration Options:**

| Option | Type | Description |
|--------|------|-------------|
| `theme` | string | 'dark', 'light', or 'minimal' |
| `className` | string | Additional CSS classes |
| `styles` | object | CSS custom property overrides |
| `labels` | object | Custom label text |
| `placeholders` | object | Custom placeholder text |

**Accessibility Features:**
- Proper label associations
- ARIA attributes (`aria-live`, `aria-busy`)
- Keyboard navigation support
- Error message announcements

#### `api.js` - API Client

Manages server communication:

| Function | Purpose |
|----------|---------|
| `getAuthToken(clientId)` | Fetches JWS auth token from server |
| `submitPayment(paymentData)` | Encrypts and submits payment |

**Token Management:**
- Tokens stored in memory (not localStorage for security)
- Automatic token refresh on 401 responses
- Client ID generated with timestamp for uniqueness

#### `jwt.js` - JWE Encryption

Encrypts payment data before transmission:

```javascript
export async function encryptPayload(payload) {
  const publicKey = await getEncryptPublicKey();
  const jwe = await new CompactEncrypt(plaintext)
    .setProtectedHeader({
      alg: 'RSA-OAEP-256',
      enc: 'A256GCM'
    })
    .encrypt(publicKey);
  return jwe;
}
```

#### `validators.js` - Input Validation

**Formatters:**

| Function | Input | Output |
|----------|-------|--------|
| `formatCardNumber` | "4111111111111111" | "4111 1111 1111 1111" |
| `formatExpirationDate` | "1225" | "12/25" |
| `formatCvv` | "123a" | "123" |
| `formatPostalCode` | "12345-6789" | "12345" |

**Validators:**

| Function | Validation Rules |
|----------|-----------------|
| `validateCardNumber` | 13-19 digits, Luhn algorithm |
| `validateExpirationDate` | MM/YY format, not expired |
| `validateCvv` | 3-4 digits |
| `validatePostalCode` | 5 digits |

### Theming System

The client supports three built-in themes via CSS custom properties:

**Dark Theme (default):**
- Dark background (#1a1a2e)
- Light text
- Accent color (#4f46e5)

**Light Theme:**
- White background
- Dark text
- Gray borders

**Minimal Theme:**
- Transparent background
- Minimal borders
- Subtle styling

**Custom Styles:**
```javascript
PaymentForm(onSubmit, amount, {
  styles: {
    'primary': '#10b981',
    'primary-hover': '#059669',
    'border-radius': '8px',
    'bg': '#ffffff'
  }
});
```

### Testing

Client-side tests using Vitest:

**Validator Tests (`validators.test.js`):**
- Input formatting functions
- Luhn algorithm validation
- Date expiration logic
- Edge cases and error conditions

**Run tests:**
```bash
cd client && npm test
```

---

## Environment Configuration

### Required Environment Variables

```bash
# .env (root directory)

# Auth Token Keys (RS256 for JWS signing)
AUTH_PRIVATE_KEY=<base64-encoded PEM>
AUTH_PUBLIC_KEY=<base64-encoded PEM>

# Encryption Keys (RSA-OAEP for JWE encryption)
ENCRYPT_PRIVATE_KEY=<base64-encoded PEM>
ENCRYPT_PUBLIC_KEY=<base64-encoded PEM>

# Server config
SERVER_PORT=3001
```

### Key Distribution

| Key | Server | Client |
|-----|--------|--------|
| AUTH_PRIVATE_KEY | Yes | No |
| AUTH_PUBLIC_KEY | Yes | No (optional) |
| ENCRYPT_PRIVATE_KEY | Yes | No |
| ENCRYPT_PUBLIC_KEY | No | Yes |

---

## Security Considerations

### Implemented Protections

1. **Transport Security**: All sensitive data encrypted at application layer
2. **Token Expiration**: Short-lived tokens (5 minutes) limit exposure window
3. **Asymmetric Encryption**: Private keys never leave server
4. **Input Validation**: Both client and server-side validation
5. **CORS**: Configured to control cross-origin access

### Recommendations for Production

1. **HTTPS**: Always use TLS in production
2. **Key Rotation**: Implement periodic key rotation
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **Token Refresh**: Implement refresh token flow for longer sessions
5. **Audit Logging**: Log all payment attempts
6. **PCI Compliance**: Consider tokenization service for card data

---

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### Running the Application

```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Start client
cd client && npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Or individually
cd client && npm test
cd server && npm test
```

### End-to-End Test

```bash
# With server running
node test-flow.js
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Client Framework | Vanilla JavaScript (ES Modules) |
| Client Build | Vite |
| Server Framework | Express.js |
| JWT Library | jose |
| Testing | Vitest, Supertest |
| Package Manager | npm |
