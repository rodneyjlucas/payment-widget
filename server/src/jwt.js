import { SignJWT, jwtVerify, compactDecrypt, importPKCS8, importSPKI } from 'jose';

/**
 * Get the auth private key (for signing JWS tokens)
 */
async function getAuthPrivateKey() {
  const keyBase64 = process.env.AUTH_PRIVATE_KEY;
  if (!keyBase64) {
    throw new Error('AUTH_PRIVATE_KEY not configured');
  }
  const pem = Buffer.from(keyBase64, 'base64').toString('utf-8');
  return importPKCS8(pem, 'RS256');
}

/**
 * Get the auth public key (for verifying JWS tokens)
 */
async function getAuthPublicKey() {
  const keyBase64 = process.env.AUTH_PUBLIC_KEY;
  if (!keyBase64) {
    throw new Error('AUTH_PUBLIC_KEY not configured');
  }
  const pem = Buffer.from(keyBase64, 'base64').toString('utf-8');
  return importSPKI(pem, 'RS256');
}

/**
 * Get the encryption private key (for decrypting JWE)
 */
async function getEncryptPrivateKey() {
  const keyBase64 = process.env.ENCRYPT_PRIVATE_KEY;
  if (!keyBase64) {
    throw new Error('ENCRYPT_PRIVATE_KEY not configured');
  }
  const pem = Buffer.from(keyBase64, 'base64').toString('utf-8');
  return importPKCS8(pem, 'RSA-OAEP-256');
}

/**
 * Issue a short-lived auth token (JWS RS256)
 * @param {object} claims - Claims to include in the token
 * @returns {Promise<string>} - Signed JWT
 */
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

/**
 * Verify an auth token (JWS RS256)
 * @param {string} token - The JWT to verify
 * @returns {Promise<object>} - The verified payload
 */
export async function verifyAuthToken(token) {
  const publicKey = await getAuthPublicKey();

  try {
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'jwt-payment-server'
    });
    return payload;
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Auth token has expired');
    }
    throw new Error('Invalid auth token');
  }
}

/**
 * Decrypt a JWE encrypted payload
 * @param {string} jwe - The JWE compact serialization
 * @returns {Promise<object>} - The decrypted payload
 */
export async function decryptPayload(jwe) {
  const privateKey = await getEncryptPrivateKey();

  try {
    const { plaintext } = await compactDecrypt(jwe, privateKey);
    const payload = JSON.parse(new TextDecoder().decode(plaintext));
    return payload;
  } catch (error) {
    throw new Error('Failed to decrypt payload: ' + error.message);
  }
}
