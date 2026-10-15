import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('three/build') || id.includes('three/addons')) {
            return 'three-vendor';
          }
        }
      }
    }
  }
});
