import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env from root directory
  const env = loadEnv(mode, '../', '');

  return {
    define: {
      'import.meta.env.ENCRYPT_PUBLIC_KEY': JSON.stringify(env.ENCRYPT_PUBLIC_KEY),
      'import.meta.env.SERVER_PORT': JSON.stringify(env.SERVER_PORT || '3001')
    },
    server: {
      port: 5173
    }
  };
});
