import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 3000
    // Note: In production, use full URLs via environment variables
    // The API clients directly call the full API URLs
  }
});

