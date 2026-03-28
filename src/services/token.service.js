const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Token = require("../models/Token.model");
const ApiError = require("../utils/ApiError");

// ── Generate access token ────────────────────────────────────────────────────
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });
};

// ── Generate refresh token ───────────────────────────────────────────────────
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
};

// ── Issue a brand new token pair (login / OAuth) ─────────────────────────────
const issueTokenPair = async (user, meta = {}) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // every new login starts a fresh token family
  const family = uuidv4();

  // decode to get expiry timestamp
  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  // save refresh token record to DB
  await Token.create({
    userId: user._id,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
    isRefreshTokenRevoked: false,
    family,
    userAgent: meta.userAgent || null,
    ipAddress: meta.ipAddress || null,
  });

  return { accessToken, refreshToken };
};

// ── Rotate refresh token ─────────────────────────────────────────────────────
const rotateRefreshToken = async (incomingRefreshToken, meta = {}) => {
  // Step 1: verify the token is a valid JWT
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // Step 2: find the token record in DB
  const tokenRecord = await Token.findOne({
    refreshToken: incomingRefreshToken,
  });

  if (!tokenRecord) {
    throw new ApiError(401, "Refresh token not found");
  }

  // Step 3: check if token was already used (reuse detection)
  if (tokenRecord.isRefreshTokenRevoked) {
    // token reuse detected — revoke entire family
    await Token.revokeFamilyTokens(tokenRecord.family);
    throw new ApiError(401, "Token reuse detected. All sessions revoked");
  }

  // Step 4: check expiry in DB (double check)
  if (new Date() > tokenRecord.refreshTokenExpiresAt) {
    throw new ApiError(401, "Refresh token has expired. Please login again");
  }

  // Step 5: revoke the old token
  tokenRecord.isRefreshTokenRevoked = true;
  await tokenRecord.save();

  // Step 6: issue new token pair with same family
  const payload = {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  const newDecoded = jwt.decode(newRefreshToken);
  const expiresAt = new Date(newDecoded.exp * 1000);

  // Step 7: save new refresh token — same family, new token
  await Token.create({
    userId: decoded.userId,
    refreshToken: newRefreshToken,
    refreshTokenExpiresAt: expiresAt,
    isRefreshTokenRevoked: false,
    family: tokenRecord.family, // same family chain continues
    userAgent: meta.userAgent || null,
    ipAddress: meta.ipAddress || null,
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// ── Revoke single refresh token (logout current device) ──────────────────────
const revokeRefreshToken = async (refreshToken) => {
  const tokenRecord = await Token.findOne({ refreshToken });

  if (!tokenRecord) {
    throw new ApiError(404, "Token not found");
  }

  tokenRecord.isRefreshTokenRevoked = true;
  await tokenRecord.save();
};

// ── Revoke all tokens for a user (logout all devices) ────────────────────────
const revokeAllTokens = async (userId) => {
  await Token.revokeAllForUser(userId);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllTokens,
};
