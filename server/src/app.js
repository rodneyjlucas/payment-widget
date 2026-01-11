import cors from 'cors';
import express from 'express';

import { decryptPayload, issueAuthToken, verifyAuthToken } from './jwt.js';

const app = express();

app.use(cors());
app.use(express.json());

// Auth endpoint - issues short-lived JWS token (RS256)
app.post('/api/auth', async (req, res) => {
	try {
		const { clientId } = req.body;

		if (!clientId) {
			return res.status(400).json({
				success: false,
				error: 'clientId is required'
			});
		}

		// Issue a short-lived auth token
		const token = await issueAuthToken({ clientId });

		console.log(`Auth token issued for client: ${clientId}`);

		res.json({
			success: true,
			token,
			expiresIn: 300 // 5 minutes
		});
	} catch (error) {
		console.error('Auth error:', error.message);
		res.status(500).json({
			success: false,
			error: 'Failed to issue auth token'
		});
	}
});

// Payment submission endpoint
// Expects: Authorization header with Bearer JWS token
// Body: { payload_jwe: "<encrypted JWE>" }
app.post('/api/payment', async (req, res) => {
	try {
		// 1. Extract and verify auth token from Authorization header
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({
				success: false,
				error: 'Authorization header required'
			});
		}

		const authToken = authHeader.substring(7);
		const authPayload = await verifyAuthToken(authToken);
		console.log('Auth verified for client:', authPayload.clientId);

		// 2. Decrypt the JWE payload
		const { payload_jwe } = req.body;
		if (!payload_jwe) {
			return res.status(400).json({
				success: false,
				error: 'payload_jwe is required'
			});
		}

		const paymentData = await decryptPayload(payload_jwe);
		console.log('Payment payload decrypted:', paymentData);

		// 3. Process the payment (simulated)
		const result = {
			success: true,
			message: 'Payment processed successfully',
			transactionId: crypto.randomUUID(),
			amount: paymentData.amount,
			clientId: authPayload.clientId,
			timestamp: new Date().toISOString()
		};

		res.json(result);
	} catch (error) {
		console.error('Payment error:', error.message);

		if (error.message.includes('expired') || error.message.includes('Invalid')) {
			return res.status(401).json({
				success: false,
				error: error.message
			});
		}

		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

export default app;
