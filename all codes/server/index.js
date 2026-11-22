/**
 * index.js
 * LabVerse AI Tutor Backend Server.
 * Secure, production-ready API bridge to Google Gemini for WebXR Physics Practical.
 */

import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { createTutorRouter } from './routes/tutorRoute.js';

// Safely load .env file if available (Node 20+)
try {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'all codes', '.env'),
    path.resolve(process.cwd(), '..', '.env')
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envPath);
      break;
    }
  }
} catch (e) {
  // Ignore missing .env
}

export function createApp(options = {}) {
  const app = express();

  // 1. Basic security headers
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // 2. CORS configuration
  const allowedOriginsStr = process.env.CORS_ORIGINS ?? 'http://localhost:5173,https://localhost:5173,http://127.0.0.1:5173,https://127.0.0.1:5173';
  const allowedOrigins = new Set(allowedOriginsStr.split(',').map((o) => o.trim()).filter(Boolean));

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.has(origin) || process.env.NODE_ENV !== 'production')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // 3. Request body parsing with strict size limits (64 KB)
  app.use(express.json({ limit: '64kb' }));

  // 4. Rate Limiter (sliding window)
  const rateLimiter = options.rateLimiter ?? createRateLimiter(options.rateLimiterOptions);
  app.use('/api/', rateLimiter);

  // 5. Mount Tutor Route
  const tutorRouter = createTutorRouter(options);
  app.use('/api/tutor', tutorRouter);

  // 6. Global Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'labverse-backend',
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: Date.now()
    });
  });

  // 7. 404 handler for undefined API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${req.originalUrl} not found.`
        }
      });
    }
    next();
  });

  return app;
}

// Start server if executed directly
if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`[LabVerse Server] AI Tutor Backend listening on port ${port} (Environment: ${process.env.NODE_ENV ?? 'development'})`);
  });

  const shutdown = () => {
    console.log('\n[LabVerse Server] Shutting down gracefully...');
    server.close(() => {
      console.log('[LabVerse Server] Closed all connections.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
