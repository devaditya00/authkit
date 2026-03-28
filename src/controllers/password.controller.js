const User = require("../models/User.model");
const Token = require("../models/Token.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { generateToken, hashToken } = require("../utils/crypto");
const { sendPasswordResetEmail } = require("../services/email.service");
const { revokeAllTokens } = require("../services/token.service");

// ── Forgot password ───────────────────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Step 1: find user — always return same response
  const user = await User.findOne({ email });

  // Step 2: same response regardless — email enumeration prevention
  const genericResponse = new ApiResponse(
    200,
    "If an account with that email exists, a password reset link has been sent",
    null
  );

  if (!user || !user.isVerified) {
    return res.status(200).json(genericResponse);
  }

  // Step 3: block OAuth users from password reset
  if (user.oauthProvider) {
    return res.status(200).json(genericResponse);
  }

  // Step 4: generate reset token
  const { rawToken, hashedToken } = generateToken();

  // Step 5: save hashed token — replace any existing reset token
  await Token.findOneAndUpdate(
    { userId: user._id },
    {
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
    { upsert: true, new: true }
  );

  // Step 6: send reset email
  await sendPasswordResetEmail(user, rawToken);

  return res.status(200).json(genericResponse);
});

// ── Reset password ────────────────────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Step 1: hash incoming token
  const hashedToken = hashToken(token);

  // Step 2: find valid token record
  const tokenRecord = await Token.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresAt: { $gt: new Date() },
  });

  if (!tokenRecord) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  // Step 3: find user
  const user = await User.findById(tokenRecord.userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Step 4: update password — pre-save hook will hash it
  user.password = password;
  user.passwordChangedAt = new Date();
  await user.save();

  // Step 5: clear reset token
  tokenRecord.passwordResetToken = null;
  tokenRecord.passwordResetExpiresAt = null;
  await tokenRecord.save();

  // Step 6: revoke all active sessions — force re-login everywhere
  await revokeAllTokens(user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      "Password reset successful. Please login with your new password",
      null
    )
  );
});

// ── Change password (logged in user) ─────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Step 1: fetch user with password
  const user = await User.findById(req.user.userId).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Step 2: verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // Step 3: update password
  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  // Step 4: revoke all other sessions except current
  await revokeAllTokens(user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      "Password changed successfully. Please login again",
      null
    )
  );
});

module.exports = { forgotPassword, resetPassword, changePassword };
