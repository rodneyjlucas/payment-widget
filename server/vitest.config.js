import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		env: {
			// Load from root .env file
		},
		setupFiles: ['./vitest.setup.js'],
	},
});
