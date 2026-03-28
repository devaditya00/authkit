const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { rotateRefreshToken } = require("../services/token.service");

// ── Refresh access token ──────────────────────────────────────────────────────
const refresh = asyncHandler(async (req, res) => {
  // get from cookie (browser) or body (mobile/Postman)
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  // rotate: revoke old, issue new pair
  const { accessToken, refreshToken: newRefreshToken } =
    await rotateRefreshToken(incomingRefreshToken, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

  // update cookie with new refresh token
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json(
    new ApiResponse(200, "Token refreshed successfully", { accessToken })
  );
});

module.exports = { refresh };