const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const authenticate = asyncHandler(async (req, res, next) => {
  // ── Step 1: Extract token from header ────────────────────────────────────
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Access denied. No token provided");
  }

  // ── Step 2: Verify token signature + expiry ───────────────────────────────
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

  // ── Step 3: Check if user still exists ───────────────────────────────────
  const user = await User.findById(decoded.userId).select(
    "+passwordChangedAt"
  );

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  // ── Step 4: Check if password was changed after token was issued ──────────
  if (user.wasPasswordChangedAfter(decoded.iat)) {
    throw new ApiError(401, "Password recently changed. Please login again");
  }
// email verification
  req.user = {
    userId: user._id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
  };

  next();
});

// ── Role-based access control ─────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new ApiError(
      403,
      `Role '${req.user.role}' is not authorized to access this route`
    );
  }
  next();
};

module.exports = { authenticate, authorize };
