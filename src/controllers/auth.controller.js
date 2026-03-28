const User = require("../models/User.model");
const Token = require("../models/Token.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { issueTokenPair, revokeRefreshToken, revokeAllTokens } = require("../services/token.service");
const { sendVerificationEmail } = require("../services/email.service");
const { generateToken } = require("../utils/crypto");

// ── Register ─────────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Step 1: check if email already taken
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  // Step 2: create user (password hashed by pre-save hook)
  const user = await User.create({ name, email, password });

  // Step 3: generate email verification token
  const { rawToken, hashedToken } = generateToken();

  // Step 4: save hashed token to DB
  await Token.create({
    userId: user._id,
    emailVerificationToken: hashedToken,
    emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  });

  // Step 5: send verification email with raw token
  await sendVerificationEmail(user, rawToken);

  // Step 6: respond — don't issue JWT yet, email must be verified first
  return res.status(201).json(
    new ApiResponse(201, "Registration successful. Please verify your email.", {
      userId: user._id,
      email: user.email,
    })
  );
});

// ── Login ────────────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Step 1: find user — explicitly select password (select: false by default)
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Step 2: check if OAuth user trying to use password login
  if (user.oauthProvider && !user.password) {
    throw new ApiError(400, `This account uses ${user.oauthProvider} login. Please sign in with ${user.oauthProvider}.`);
  }

  // Step 3: verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Step 4: check email verification
  if (!user.isVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  // Step 5: issue token pair
  const { accessToken, refreshToken } = await issueTokenPair(user, {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  // Step 6: update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Step 7: set refresh token in httpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  return res.status(200).json(
    new ApiResponse(200, "Login successful", {
      accessToken,
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
    })
  );
});

// ── Logout (current device) ───────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  // get refresh token from cookie or body
  const refreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (refreshToken) {
    await revokeRefreshToken(refreshToken).catch(() => {});
  }

  // clear the cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json(
    new ApiResponse(200, "Logged out successfully", null)
  );
});

// ── Logout all devices ────────────────────────────────────────────────────────
const logoutAll = asyncHandler(async (req, res) => {
  await revokeAllTokens(req.user.userId);

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json(
    new ApiResponse(200, "Logged out from all devices", null)
  );
});

// ── Get current user ──────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "User fetched successfully", {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      oauthProvider: user.oauthProvider,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    })
  );
});

module.exports = { register, login, logout, logoutAll, getMe };