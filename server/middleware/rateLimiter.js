const { query } = require('../config/database');
const AuditService = require('../services/auditService');

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map();

class RateLimiter {
  /**
   * Create a rate limiter middleware
   * @param {Object} options - Rate limiting options
   * @param {number} options.windowMs - Time window in milliseconds
   * @param {number} options.max - Maximum number of requests per window
   * @param {string} options.message - Error message when limit exceeded
   * @param {Function} options.keyGenerator - Function to generate rate limit key
   * @param {boolean} options.skipSuccessfulRequests - Skip counting successful requests
   * @param {boolean} options.skipFailedRequests - Skip counting failed requests
   * @returns {Function} Express middleware
   */
  static createLimiter(options = {}) {
    const {
      windowMs = 60 * 1000, // 1 minute
      max = 60, // 60 requests per minute
      message = 'Too many requests, please try again later',
      keyGenerator = (req) => req.ip,
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return async (req, res, next) => {
      try {
        const key = keyGenerator(req);
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean up old entries
        this.cleanupOldEntries(key, windowStart);

        // Get current count for this key
        const requests = rateLimitStore.get(key) || [];
        const currentCount = requests.filter(timestamp => timestamp > windowStart).length;

        // Check if limit exceeded
        if (currentCount >= max) {
          // Log rate limit violation
          await AuditService.logEvent({
            userId: req.user?.id || null,
            userEmail: req.user?.email || 'anonymous',
            action: 'RATE_LIMIT_EXCEEDED',
            resourceType: 'API',
            resourceId: req.path,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            success: false,
            errorMessage: `Rate limit exceeded: ${currentCount}/${max} requests`,
            metadata: {
              method: req.method,
              path: req.path,
              windowMs,
              max
            }
          });

          return res.status(429).json({
            error: message,
            retryAfter: Math.ceil(windowMs / 1000)
          });
        }

        // Add current request timestamp
        requests.push(now);
        rateLimitStore.set(key, requests);

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': max,
          'X-RateLimit-Remaining': Math.max(0, max - currentCount - 1),
          'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
        });

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        next(); // Continue on error to avoid breaking the application
      }
    };
  }

  /**
   * Clean up old entries from the rate limit store
   * @param {string} key - Rate limit key
   * @param {number} windowStart - Window start timestamp
   */
  static cleanupOldEntries(key, windowStart) {
    const requests = rateLimitStore.get(key);
    if (requests) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, validRequests);
      }
    }
  }

  /**
   * Clear all rate limit data for a key
   * @param {string} key - Rate limit key
   */
  static clearKey(key) {
    rateLimitStore.delete(key);
  }

  /**
   * Get current rate limit status for a key
   * @param {string} key - Rate limit key
   * @param {number} windowMs - Time window in milliseconds
   * @param {number} max - Maximum requests per window
   * @returns {Object} Rate limit status
   */
  static getStatus(key, windowMs = 60 * 1000, max = 60) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const requests = rateLimitStore.get(key) || [];
    const currentCount = requests.filter(timestamp => timestamp > windowStart).length;

    return {
      key,
      current: currentCount,
      max,
      remaining: Math.max(0, max - currentCount),
      resetTime: new Date(now + windowMs),
      isLimited: currentCount >= max
    };
  }
}

// Predefined rate limiters for common use cases
const rateLimiters = {
  // General API rate limiter
  api: RateLimiter.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many API requests, please try again later'
  }),

  // Strict rate limiter for authentication endpoints
  auth: RateLimiter.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: 'Too many authentication attempts, please try again later',
    keyGenerator: (req) => `auth:${req.ip}:${req.body.email || 'unknown'}`
  }),

  // Rate limiter for password reset requests
  passwordReset: RateLimiter.createLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: 'Too many password reset requests, please try again later',
    keyGenerator: (req) => `password-reset:${req.ip}:${req.body.email || 'unknown'}`
  }),

  // Rate limiter for file uploads
  upload: RateLimiter.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    message: 'Too many file uploads, please try again later'
  }),

  // Rate limiter for search endpoints
  search: RateLimiter.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: 'Too many search requests, please try again later'
  }),

  // Rate limiter for admin actions
  admin: RateLimiter.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 admin actions per minute
    message: 'Too many admin actions, please try again later',
    keyGenerator: (req) => `admin:${req.user?.id || req.ip}`
  })
};

// Middleware to apply rate limiting based on endpoint
const applyRateLimit = (type = 'api') => {
  return (req, res, next) => {
    const limiter = rateLimiters[type];
    if (limiter) {
      return limiter(req, res, next);
    }
    next();
  };
};

// Middleware to check for suspicious activity
const suspiciousActivityDetector = async (req, res, next) => {
  try {
    const ip = req.ip;
    const userAgent = req.get('User-Agent');
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes

    // Check for rapid requests from same IP
    const rapidRequestKey = `rapid:${ip}`;
    const rapidRequests = rateLimitStore.get(rapidRequestKey) || [];
    const recentRequests = rapidRequests.filter(timestamp => timestamp > now - windowMs);

    if (recentRequests.length > 100) { // More than 100 requests in 5 minutes
      await AuditService.logEvent({
        userId: req.user?.id || null,
        userEmail: req.user?.email || 'anonymous',
        action: 'SUSPICIOUS_ACTIVITY_DETECTED',
        resourceType: 'SECURITY',
        resourceId: 'RAPID_REQUESTS',
        ipAddress: ip,
        userAgent: userAgent,
        success: false,
        errorMessage: `Rapid requests detected: ${recentRequests.length} requests in 5 minutes`,
        metadata: {
          requestCount: recentRequests.length,
          windowMs: windowMs,
          path: req.path,
          method: req.method
        }
      });
    }

    // Add current request
    recentRequests.push(now);
    rateLimitStore.set(rapidRequestKey, recentRequests);

    next();
  } catch (error) {
    console.error('Suspicious activity detector error:', error);
    next();
  }
};

module.exports = {
  RateLimiter,
  rateLimiters,
  applyRateLimit,
  suspiciousActivityDetector
};
