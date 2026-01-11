# JWT Payment Flow

A secure payment processing system using JSON Web Tokens (JWT) for authentication and encryption. The architecture employs JWS (JSON Web Signature) for authentication and JWE (JSON Web Encryption) for payload protection.

## Features

- **Dual-token security**: JWS for authentication, JWE for payload encryption
- **Asymmetric cryptography**: RSA keys for signing and encryption
- **Configurable payment form**: Theming, custom labels, and accessibility support
- **Input validation**: Client-side formatting and Luhn algorithm verification
- **Comprehensive tests**: Unit and integration tests for client and server

## Quick Start

```bash
# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Start the server
cd server && npm run dev

# In another terminal, start the client
cd client && npm run dev
```

Visit `http://localhost:5173` to see the payment form.

## Documentation

For detailed system architecture and implementation details, see [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md).

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the root directory:

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

### Generating Keys

To generate new RSA key pairs:

```bash
# Generate auth keys (for JWS signing)
openssl genrsa -out auth_private.pem 2048
openssl rsa -in auth_private.pem -pubout -out auth_public.pem

# Generate encryption keys (for JWE)
openssl genrsa -out encrypt_private.pem 2048
openssl rsa -in encrypt_private.pem -pubout -out encrypt_public.pem

# Base64 encode for .env file
cat auth_private.pem | base64 -w 0
cat auth_public.pem | base64 -w 0
cat encrypt_private.pem | base64 -w 0
cat encrypt_public.pem | base64 -w 0
```

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

The server runs on `http://localhost:3001` and the client on `http://localhost:5173`.

### Running Tests

```bash
# Run all tests
npm test

# Or individually
cd client && npm test
cd server && npm test
```

### End-to-End Test

Run the full payment flow test with the server running:

```bash
node test-flow.js
```

---

## API Endpoints

### POST `/api/auth`

Issues a short-lived authentication token.

**Request:**
```json
{
  "clientId": "web-client-123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 300
}
```

### POST `/api/payment`

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

**Response:**
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

---

## License

MIT
