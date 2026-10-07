import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    host: true,
  },
  preview: {
    port: 3000,
  },
  define: {
    // Backward compatibility shim for legacy CRA process.env.PUBLIC_URL references
    'process.env.PUBLIC_URL': JSON.stringify(''),
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/setupTests.js',
  },
});
