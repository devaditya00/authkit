const rateLimit = require("express-rate-limit");
const ApiError = require("../utils/ApiError");

//Generic rate limit message handler
const rateLimitHandler = (req, res, next, options) => {
  next(new ApiError(429, options.message));
};

//Global limiter: applies to every route
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later",
  handler: rateLimitHandler,
});

//Auth limiter: tighter limit on login, register, forgot password
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts, please try again after 15 minutes",
  handler: rateLimitHandler,
});

//Resend email limiter: strict limit on resend verification
const resendEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, //1 hour window
  max: 3,// only 3 resends per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many email requests, please try again after an hour",
  handler: rateLimitHandler,
});

module.exports = { globalLimiter, authLimiter, resendEmailLimiter };
