const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
  let error = err;

  // ── Convert known error types to ApiError ──────────────────────────────
  
  // Mongoose duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ApiError(409, `${field} already exists`);
  }

  // Mongoose validation error
  else if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = new ApiError(400, "Validation failed", errors);
  }

  // Mongoose bad ObjectId (e.g. /users/not-a-valid-id)
  else if (err.name === "CastError") {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  // JWT errors
  else if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token");
  }

  else if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Token has expired");
  }

  //If it's not an ApiError by now, treat as 500
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const message =
    error instanceof ApiError
      ? error.message
      : process.env.NODE_ENV === "production"
      ? "Something went wrong"
      : err.message;

  //Log server errors
  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${err.stack}`);
  }

  //Send consistent error response
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: error instanceof ApiError ? error.errors : [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;