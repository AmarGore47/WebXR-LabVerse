/**
 * rateLimiter.js
 * In-memory sliding-window rate limiter middleware for LabVerse AI Tutor API.
 * Provides protection against denial-of-service and API quota exhaustion.
 */

export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs ?? (Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000);
  const maxRequests = options.maxRequests ?? (Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 20);

  // Store: Map<IP, Array<timestamp>>
  const hits = new Map();

  // Periodic cleanup of expired records every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(ip);
      } else {
        hits.set(ip, valid);
      }
    }
  }, 300000);

  // Allow tests or server shutdown to unref the timer
  if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  const limiterMiddleware = (req, res, next) => {
    // Extract client IP address supporting reverse proxies
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1';

    const now = Date.now();
    const timestamps = hits.get(ip) ?? [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const oldestHit = validTimestamps[0];
      const resetTimeSec = Math.ceil((oldestHit + windowMs - now) / 1000);

      res.setHeader('Retry-After', resetTimeSec);
      res.setHeader('RateLimit-Limit', maxRequests);
      res.setHeader('RateLimit-Remaining', 0);
      res.setHeader('RateLimit-Reset', resetTimeSec);

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many questions asked. Please wait ${resetTimeSec} second(s) before asking again.`
        }
      });
    }

    validTimestamps.push(now);
    hits.set(ip, validTimestamps);

    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', maxRequests - validTimestamps.length);

    next();
  };

  // Helper method for testing & maintenance
  limiterMiddleware.reset = () => {
    hits.clear();
  };

  return limiterMiddleware;
}
