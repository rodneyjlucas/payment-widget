import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { CompactEncrypt, importSPKI } from 'jose';
import app from './app.js';
import { issueAuthToken } from './jwt.js';

/**
 * Helper to create a valid JWE for testing
 */
async function createTestJwe(payload) {
	const keyBase64 = process.env.ENCRYPT_PUBLIC_KEY;
	const pem = Buffer.from(keyBase64, 'base64').toString('utf-8');
	const publicKey = await importSPKI(pem, 'RSA-OAEP-256');

	const encoder = new TextEncoder();
	const jwe = await new CompactEncrypt(encoder.encode(JSON.stringify(payload)))
		.setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
		.encrypt(publicKey);

	return jwe;
}

describe('POST /api/auth', () => {
	it('returns token with valid clientId', async () => {
		const response = await request(app)
			.post('/api/auth')
			.send({ clientId: 'test-client' });

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.token).toBeDefined();
		expect(typeof response.body.token).toBe('string');
		expect(response.body.expiresIn).toBe(300);
	});

	it('returns 400 if clientId is missing', async () => {
		const response = await request(app)
			.post('/api/auth')
			.send({});

		expect(response.status).toBe(400);
		expect(response.body.success).toBe(false);
		expect(response.body.error).toBe('clientId is required');
	});

	it('returns 400 if body is empty', async () => {
		const response = await request(app)
			.post('/api/auth')
			.send();

		expect(response.status).toBe(400);
		expect(response.body.success).toBe(false);
		expect(response.body.error).toBe('clientId is required');
	});

	it('returns token with different clientIds', async () => {
		const response1 = await request(app)
			.post('/api/auth')
			.send({ clientId: 'client-1' });

		const response2 = await request(app)
			.post('/api/auth')
			.send({ clientId: 'client-2' });

		expect(response1.body.token).not.toBe(response2.body.token);
	});
});

describe('POST /api/payment', () => {
	describe('Authorization validation', () => {
		it('returns 401 without Authorization header', async () => {
			const response = await request(app)
				.post('/api/payment')
				.send({ payload_jwe: 'some-jwe' });

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toBe('Authorization header required');
		});

		it('returns 401 with malformed Authorization header (no Bearer prefix)', async () => {
			const response = await request(app)
				.post('/api/payment')
				.set('Authorization', 'some-token')
				.send({ payload_jwe: 'some-jwe' });

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toBe('Authorization header required');
		});

		it('returns 401 with invalid token', async () => {
			const response = await request(app)
				.post('/api/payment')
				.set('Authorization', 'Bearer invalid-token')
				.send({ payload_jwe: 'some-jwe' });

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toBe('Invalid auth token');
		});

		it('returns 401 with expired token', async () => {
			// Issue a valid token
			const token = await issueAuthToken({ clientId: 'test-client' });

			// Mock time to be 6 minutes in the future
			vi.useFakeTimers();
			vi.setSystemTime(Date.now() + 6 * 60 * 1000);

			const jwe = await createTestJwe({ amount: 100 });

			const response = await request(app)
				.post('/api/payment')
				.set('Authorization', `Bearer ${token}`)
				.send({ payload_jwe: jwe });

			expect(response.status).toBe(401);
			expect(response.body.error).toBe('Auth token has expired');

			vi.useRealTimers();
		});
	});

	describe('Payload validation', () => {
		it('returns 400 without payload_jwe', async () => {
			const token = await issueAuthToken({ clientId: 'test-client' });

			const response = await request(app)
				.post('/api/payment')
				.set('Authorization', `Bearer ${token}`)
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toBe('payload_jwe is required');
		});

		it('returns error with invalid JWE', async () => {
			const token = await issueAuthToken({ clientId: 'test-client' });

			const response = await request(app)
				.post('/api/payment')
				.set('Authorization', `Bearer ${token}`)
				.send({ payload_jwe: 'not-a-valid-jwe-format' });

			// Server returns 401 because error message contains "Invalid" (from jose library)
			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('Failed to decrypt payload');
		});
	});

	describe('Successful payment', () => {
		it('returns 200 with valid request', async () => {
			const token = await issueAuthToken({ clientId: 'test-client' });
			const paymentData = {
				cardNumber: '4111111111111111',
				expirationDate: '12/25',
				cvv: '123',
				postalCode: '12345',
				amount: 99.99
			};
			const jwe = await createTestJwe(paymentData);

			const response = await request(app)
				.post('/api/payment')
				.set('Authorization', `Bearer ${token}`)
				.send({ payload_jwe: jwe });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.message).toBe('Payment processed successfully');
		});

		it('response includes transactionId, amount, clientId', async () => {
			const token = await issueAuthToken({ clientId: 'my-client' });
			const paymentData = { amount: 150.00 };
			const jwe = await createTestJwe(paymentData);

			const response = await request(app)
				.post('/api/payment')
				.set('Authorization', `Bearer ${token}`)
				.send({ payload_jwe: jwe });

			expect(response.body.transactionId).toBeDefined();
			expect(typeof response.body.transactionId).toBe('string');
			expect(response.body.amount).toBe(150.00);
			expect(response.body.clientId).toBe('my-client');
			expect(response.body.timestamp).toBeDefined();
		});

		it('generates unique transactionIds for each payment', async () => {
			const token = await issueAuthToken({ clientId: 'test-client' });
			const jwe = await createTestJwe({ amount: 50 });

			const response1 = await request(app)
				.post('/api/payment')
				.set('Authorization', `Bearer ${token}`)
				.send({ payload_jwe: jwe });

			const response2 = await request(app)
				.post('/api/payment')
				.set('Authorization', `Bearer ${token}`)
				.send({ payload_jwe: jwe });

			expect(response1.body.transactionId).not.toBe(response2.body.transactionId);
		});
	});
});

describe('Integration: Full auth -> payment flow', () => {
	it('completes full flow successfully', async () => {
		// 1. Get auth token
		const authResponse = await request(app)
			.post('/api/auth')
			.send({ clientId: 'integration-test-client' });

		expect(authResponse.status).toBe(200);
		const token = authResponse.body.token;

		// 2. Create encrypted payment payload
		const paymentData = {
			cardNumber: '4111111111111111',
			expirationDate: '12/25',
			cvv: '123',
			postalCode: '12345',
			amount: 199.99
		};
		const jwe = await createTestJwe(paymentData);

		// 3. Submit payment
		const paymentResponse = await request(app)
			.post('/api/payment')
			.set('Authorization', `Bearer ${token}`)
			.send({ payload_jwe: jwe });

		expect(paymentResponse.status).toBe(200);
		expect(paymentResponse.body.success).toBe(true);
		expect(paymentResponse.body.amount).toBe(199.99);
		expect(paymentResponse.body.clientId).toBe('integration-test-client');
	});

	it('allows token reuse within expiry window', async () => {
		// Get a single token
		const authResponse = await request(app)
			.post('/api/auth')
			.send({ clientId: 'reuse-test' });

		const token = authResponse.body.token;

		// Use it for multiple payments
		const jwe1 = await createTestJwe({ amount: 10 });
		const jwe2 = await createTestJwe({ amount: 20 });
		const jwe3 = await createTestJwe({ amount: 30 });

		const [r1, r2, r3] = await Promise.all([
			request(app).post('/api/payment').set('Authorization', `Bearer ${token}`).send({ payload_jwe: jwe1 }),
			request(app).post('/api/payment').set('Authorization', `Bearer ${token}`).send({ payload_jwe: jwe2 }),
			request(app).post('/api/payment').set('Authorization', `Bearer ${token}`).send({ payload_jwe: jwe3 }),
		]);

		expect(r1.status).toBe(200);
		expect(r2.status).toBe(200);
		expect(r3.status).toBe(200);
	});
});
