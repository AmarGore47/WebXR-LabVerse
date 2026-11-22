import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { createApp } from './all codes/server/index.js';

let apiServer = null;

export default defineConfig({
  root: 'all codes',
  publicDir: 'public',
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/controls/OrbitControls.js',
      'three/examples/jsm/loaders/GLTFLoader.js',
      'three/examples/jsm/loaders/FBXLoader.js'
    ]
  },
  plugins: [
    basicSsl(),
    {
      name: 'labverse-api-server',
      configureServer(server) {
        if (!apiServer) {
          try {
            const apiApp = createApp();
            apiServer = apiApp.listen(3001, '127.0.0.1', () => {
              console.log('[LabVerse Server] Express API running on internal port 3001');
            });
          } catch (e) {
            console.warn('[LabVerse Server] Port 3001 already in use or error:', e.message);
          }
        }
      }
    }
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('three/build') || id.includes('three/addons') || id.includes('three/examples')) {
            return 'three-vendor';
          }
        }
      }
    }
  }
});
