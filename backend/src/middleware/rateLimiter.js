// ============================================================
// HOMESCHOOL HUB — Rate Limiter Middleware
// Protects auth endpoints from brute force attacks.
// Uses a simple in-memory store — sufficient for single-instance.
// For multi-instance deployments, replace with Redis-backed limiter.
// ============================================================

const rateLimitStore = new Map();

/**
 * Creates a rate limiter middleware.
 * @param {number} maxRequests - Max requests allowed in the window
 * @param {number} windowMs    - Time window in milliseconds
 * @param {string} message     - Error message when limit exceeded
 */
function createRateLimiter(maxRequests, windowMs, message) {
  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now > data.resetTime) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000);

  return function rateLimiter(req, res, next) {
    const key   = `${req.ip}:${req.path}`;
    const now   = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: message,
        retryAfter,
      });
    }

    next();
  };
}

// Auth rate limiter — 10 attempts per 15 minutes per IP
const authLimiter = createRateLimiter(
  10,
  15 * 60 * 1000,
  'Too many login attempts. Please try again in 15 minutes.'
);

// Password reset limiter — 3 attempts per hour per IP
const resetLimiter = createRateLimiter(
  3,
  60 * 60 * 1000,
  'Too many password reset requests. Please try again in 1 hour.'
);

// General API limiter — 200 requests per minute per IP
const apiLimiter = createRateLimiter(
  200,
  60 * 1000,
  'Too many requests. Please slow down.'
);

module.exports = { authLimiter, resetLimiter, apiLimiter };
