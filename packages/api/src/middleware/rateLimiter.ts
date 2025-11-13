/**
 * Rate Limiting Middleware
 *
 * NOTE: This module requires express-rate-limit package
 * Install with: npm install express-rate-limit
 */

import { Request, Response, NextFunction } from 'express';

// Uncomment when express-rate-limit is installed:
// import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for public booking endpoint
 * Limits to 10 booking requests per 15 minutes per IP
 */
// export const publicBookingLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // 10 requests per windowMs
//   message: 'Too many booking requests from this IP, please try again later',
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// });

/**
 * Rate limiter for availability queries
 * More lenient than booking creation
 */
// export const availabilityLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // 100 requests per windowMs
//   message: 'Too many availability requests, please try again later',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

/**
 * Rate limiter for authenticated endpoints
 * Higher limit for authenticated users
 */
// export const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // 100 requests per windowMs
//   message: 'Too many requests, please try again later',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Temporary pass-through middleware until express-rate-limit is installed
export const publicBookingLimiter = (_req: Request, _res: Response, next: NextFunction) => {
  next();
};

export const availabilityLimiter = (_req: Request, _res: Response, next: NextFunction) => {
  next();
};

export const authLimiter = (_req: Request, _res: Response, next: NextFunction) => {
  next();
};
