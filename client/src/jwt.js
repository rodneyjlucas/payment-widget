import { CompactEncrypt, importSPKI } from 'jose';

/**
 * Get the server's public encryption key (for encrypting JWE)
 */
async function getEncryptPublicKey() {
  const keyBase64 = import.meta.env.ENCRYPT_PUBLIC_KEY;
  if (!keyBase64) {
    throw new Error('ENCRYPT_PUBLIC_KEY not configured');
  }
  const pem = atob(keyBase64);
  return importSPKI(pem, 'RSA-OAEP-256');
}

/**
 * Encrypt a payload as JWE using server's public key
 * @param {object} payload - The data to encrypt
 * @returns {Promise<string>} - JWE compact serialization
 */
export async function encryptPayload(payload) {
  const publicKey = await getEncryptPublicKey();

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(payload));

  const jwe = await new CompactEncrypt(plaintext)
    .setProtectedHeader({
      alg: 'RSA-OAEP-256',
      enc: 'A256GCM'
    })
    .encrypt(publicKey);

  return jwe;
}
