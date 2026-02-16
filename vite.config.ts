import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'firebase/app', 'firebase/auth'],
          pdf: ['pdfjs-dist']
        }
      }
    }
  },
  // IMPORTANT: Only VITE_ prefixed env vars are exposed to the client.
  // This is Vite's built-in security — it will NOT leak other env vars.
  // Access them in code via: import.meta.env.VITE_GEMINI_API_KEY
});