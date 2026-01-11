import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from root project directory
dotenv.config({ path: resolve(__dirname, '../../.env') });

import app from './app.js';

const PORT = process.env.SERVER_PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/auth   - Get auth token (JWS RS256)');
  console.log('  POST /api/payment - Submit payment (JWE encrypted)');
});
