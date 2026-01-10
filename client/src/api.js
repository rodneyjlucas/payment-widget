import { encryptPayload } from './jwt.js';

const API_URL = `http://localhost:${import.meta.env.SERVER_PORT || 3001}`;

// Store auth token in memory
let authToken = null;

/**
 * Get an auth token from the server (JWS RS256)
 * @param {string} clientId - Client identifier
 * @returns {Promise<string>} - The auth token
 */
export async function getAuthToken(clientId) {
  const response = await fetch(`${API_URL}/api/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clientId })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to get auth token');
  }

  authToken = result.token;
  return authToken;
}

/**
 * Submit payment data to the server
 * - Gets auth token if not already present
 * - Encrypts payload as JWE using server's public key
 * - Sends with Authorization header containing JWS token
 *
 * @param {object} paymentData - The payment form data
 * @returns {Promise<object>} - The server response
 */
export async function submitPayment(paymentData) {
  // 1. Get auth token if we don't have one
  if (!authToken) {
    await getAuthToken(`web-client-${Date.now()}`);
  }

  // 2. Encrypt the payment payload as JWE
  const payload_jwe = await encryptPayload(paymentData);

  // 3. Submit with auth token in header and encrypted payload in body
  const response = await fetch(`${API_URL}/api/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ payload_jwe })
  });

  const result = await response.json();

  // If auth expired, clear token for next request
  if (response.status === 401) {
    authToken = null;
    throw new Error(result.error || 'Authentication failed');
  }

  if (!response.ok) {
    throw new Error(result.error || 'Payment failed');
  }

  return result;
}
