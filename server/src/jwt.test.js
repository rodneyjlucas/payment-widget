import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { issueAuthToken, verifyAuthToken, decryptPayload } from './jwt.js';
import { SignJWT, CompactEncrypt, importSPKI } from 'jose';

describe('JWT Utilities', () => {
	describe('issueAuthToken', () => {
		it('returns a valid JWT string', async () => {
			const token = await issueAuthToken({ clientId: 'test-client' });

			expect(token).toBeDefined();
			expect(typeof token).toBe('string');
			// JWT has 3 parts separated by dots
			expect(token.split('.').length).toBe(3);
		});

		it('includes provided claims in the token', async () => {
			const claims = { clientId: 'test-client', role: 'admin' };
			const token = await issueAuthToken(claims);
			const payload = await verifyAuthToken(token);

			expect(payload.clientId).toBe('test-client');
			expect(payload.role).toBe('admin');
		});

		it('sets correct issuer', async () => {
			const token = await issueAuthToken({ clientId: 'test-client' });
			const payload = await verifyAuthToken(token);

			expect(payload.iss).toBe('jwt-payment-server');
		});

		it('sets expiration time', async () => {
			const token = await issueAuthToken({ clientId: 'test-client' });
			const payload = await verifyAuthToken(token);

			expect(payload.exp).toBeDefined();
			expect(payload.iat).toBeDefined();
			// Expiration should be ~5 minutes after issued at
			expect(payload.exp - payload.iat).toBe(300);
		});
	});

	describe('verifyAuthToken', () => {
		it('accepts a valid token', async () => {
			const token = await issueAuthToken({ clientId: 'test-client' });
			const payload = await verifyAuthToken(token);

			expect(payload.clientId).toBe('test-client');
		});

		it('rejects a tampered token', async () => {
			const token = await issueAuthToken({ clientId: 'test-client' });
			// Tamper with the payload (middle part)
			const parts = token.split('.');
			parts[1] = parts[1].replace(/.$/, 'X');
			const tamperedToken = parts.join('.');

			await expect(verifyAuthToken(tamperedToken)).rejects.toThrow('Invalid auth token');
		});

		it('rejects a token with wrong signature', async () => {
			const token = await issueAuthToken({ clientId: 'test-client' });
			// Modify the signature (last part)
			const parts = token.split('.');
			parts[2] = 'invalidsignature';
			const badToken = parts.join('.');

			await expect(verifyAuthToken(badToken)).rejects.toThrow('Invalid auth token');
		});

		it('rejects an expired token', async () => {
			// Create a token that's already expired using a mock
			const originalDate = Date.now;

			// Issue token with current time
			const token = await issueAuthToken({ clientId: 'test-client' });

			// Mock time to be 6 minutes in the future (past 5 min expiry)
			vi.useFakeTimers();
			vi.setSystemTime(Date.now() + 6 * 60 * 1000);

			await expect(verifyAuthToken(token)).rejects.toThrow('Auth token has expired');

			vi.useRealTimers();
		});

		it('rejects malformed token', async () => {
			await expect(verifyAuthToken('not-a-valid-token')).rejects.toThrow('Invalid auth token');
		});

		it('rejects empty token', async () => {
			await expect(verifyAuthToken('')).rejects.toThrow('Invalid auth token');
		});
	});

	describe('decryptPayload', () => {
		async function createTestJwe(payload) {
			// Get the encryption public key from env
			const keyBase64 = process.env.ENCRYPT_PUBLIC_KEY;
			const pem = Buffer.from(keyBase64, 'base64').toString('utf-8');
			const publicKey = await importSPKI(pem, 'RSA-OAEP-256');

			const encoder = new TextEncoder();
			const jwe = await new CompactEncrypt(encoder.encode(JSON.stringify(payload)))
				.setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
				.encrypt(publicKey);

			return jwe;
		}

		it('decrypts a valid JWE payload', async () => {
			const originalPayload = {
				cardNumber: '4111111111111111',
				amount: 99.99
			};

			const jwe = await createTestJwe(originalPayload);
			const decrypted = await decryptPayload(jwe);

			expect(decrypted.cardNumber).toBe('4111111111111111');
			expect(decrypted.amount).toBe(99.99);
		});

		it('decrypts complex nested payload', async () => {
			const originalPayload = {
				cardNumber: '4111111111111111',
				expirationDate: '12/25',
				cvv: '123',
				postalCode: '12345',
				amount: 150.00,
				metadata: { orderId: 'ORD-123' }
			};

			const jwe = await createTestJwe(originalPayload);
			const decrypted = await decryptPayload(jwe);

			expect(decrypted).toEqual(originalPayload);
		});

		it('throws on invalid JWE', async () => {
			await expect(decryptPayload('invalid-jwe-string')).rejects.toThrow('Failed to decrypt payload');
		});

		it('throws on malformed JWE structure', async () => {
			// JWE should have 5 parts
			await expect(decryptPayload('a.b.c.d.e')).rejects.toThrow('Failed to decrypt payload');
		});

		it('throws on empty string', async () => {
			await expect(decryptPayload('')).rejects.toThrow('Failed to decrypt payload');
		});
	});
});

describe('Missing environment variables', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('issueAuthToken throws when AUTH_PRIVATE_KEY is missing', async () => {
		delete process.env.AUTH_PRIVATE_KEY;

		// Re-import the module to get fresh functions without cached keys
		const { issueAuthToken: freshIssue } = await import('./jwt.js');

		await expect(freshIssue({ clientId: 'test' })).rejects.toThrow('AUTH_PRIVATE_KEY not configured');
	});

	it('verifyAuthToken throws when AUTH_PUBLIC_KEY is missing', async () => {
		delete process.env.AUTH_PUBLIC_KEY;

		const { verifyAuthToken: freshVerify } = await import('./jwt.js');

		await expect(freshVerify('some-token')).rejects.toThrow('AUTH_PUBLIC_KEY not configured');
	});

	it('decryptPayload throws when ENCRYPT_PRIVATE_KEY is missing', async () => {
		delete process.env.ENCRYPT_PRIVATE_KEY;

		const { decryptPayload: freshDecrypt } = await import('./jwt.js');

		await expect(freshDecrypt('some-jwe')).rejects.toThrow('ENCRYPT_PRIVATE_KEY not configured');
	});
});
