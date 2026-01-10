/**
 * End-to-end test for JWS + JWE payment flow
 *
 * Flow:
 * 1. Client requests auth token from server (server signs with AUTH_PRIVATE_KEY)
 * 2. Client encrypts payment payload with ENCRYPT_PUBLIC_KEY (JWE)
 * 3. Client sends request with:
 *    - Authorization: Bearer <JWS auth token>
 *    - Body: { payload_jwe: "<encrypted payload>" }
 * 4. Server verifies auth token with AUTH_PUBLIC_KEY
 * 5. Server decrypts payload with ENCRYPT_PRIVATE_KEY
 */

import dotenv from 'dotenv';
import { CompactEncrypt, importSPKI } from 'jose';

dotenv.config();

const API_URL = `http://localhost:${process.env.SERVER_PORT || 3001}`;

async function getEncryptPublicKey() {
  const pem = Buffer.from(process.env.ENCRYPT_PUBLIC_KEY, 'base64').toString('utf-8');
  return importSPKI(pem, 'RSA-OAEP-256');
}

async function encryptPayload(payload) {
  const publicKey = await getEncryptPublicKey();
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  const jwe = await new CompactEncrypt(plaintext)
    .setProtectedHeader({
      alg: 'RSA-OAEP-256',
      enc: 'A256GCM'
    })
    .encrypt(publicKey);

  return jwe;
}

async function main() {
  console.log('=== JWT Payment Flow Test ===\n');

  // Step 1: Get auth token from server
  console.log('1. Requesting auth token (JWS RS256)...');
  const authResponse = await fetch(`${API_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: 'test-client-001' })
  });

  const authResult = await authResponse.json();
  if (!authResult.success) {
    throw new Error(`Failed to get auth token: ${authResult.error}`);
  }

  console.log(`   Auth token received: ${authResult.token.substring(0, 50)}...`);
  console.log('   Expires in:', authResult.expiresIn, 'seconds\n');

  // Step 2: Encrypt payment payload as JWE
  console.log('2. Encrypting payment payload (JWE RSA-OAEP-256)...');
  const paymentData = {
    cardNumber: '4111111111111111',
    expirationDate: '12/25',
    cvv: '123',
    postalCode: '12345',
    amount: 99.99
  };

  const payload_jwe = await encryptPayload(paymentData);
  console.log(`   JWE created: ${payload_jwe.substring(0, 50)}...\n`);

  // Step 3: Submit payment with auth header and encrypted payload
  console.log('3. Submitting payment...');
  console.log('   - Authorization: Bearer <JWS token>');
  console.log('   - Body: { payload_jwe: "<JWE encrypted payload>" }\n');

  const submitResponse = await fetch(`${API_URL}/api/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authResult.token}`
    },
    body: JSON.stringify({ payload_jwe })
  });

  const submitResult = await submitResponse.json();

  console.log('4. Server Response:');
  console.log(JSON.stringify(submitResult, null, 2));

  if (submitResult.success) {
    console.log('\n✓ Payment flow completed successfully!');
  } else {
    console.log('\n✗ Payment failed:', submitResult.error);
  }
}

main().catch(console.error);
