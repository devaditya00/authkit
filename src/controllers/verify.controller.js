const User = require("../models/User.model");
const Token = require("../models/Token.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { hashToken, generateToken } = require("../utils/crypto");
const { sendVerificationEmail, sendWelcomeEmail } = require("../services/email.service");

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  const hashedToken = hashToken(token);

  const tokenRecord = await Token.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiresAt: { $gt: new Date() },
  });

  if (!tokenRecord) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  const user = await User.findById(tokenRecord.userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isVerified) {
    return res.status(200).json(
      new ApiResponse(200, "Email already verified", null)
    );
  }

  user.isVerified = true;
  await user.save({ validateBeforeSave: false });

  tokenRecord.emailVerificationToken = null;
  tokenRecord.emailVerificationExpiresAt = null;
  await tokenRecord.save();

  await sendWelcomeEmail(user).catch(() => {});

  return res.status(200).json(
    new ApiResponse(200, "Email verified successfully", null)
  );
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user || user.isVerified) {
    return res.status(200).json(
      new ApiResponse(
        200,
        "If your email exists and is unverified, a new link has been sent",
        null
      )
    );
  }

  await Token.updateOne(
    { userId: user._id },
    {
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    }
  );

  const { rawToken, hashedToken } = generateToken();

  await Token.updateOne(
    { userId: user._id },
    {
      emailVerificationToken: hashedToken,
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    { upsert: true }
  );

  await sendVerificationEmail(user, rawToken);

  return res.status(200).json(
    new ApiResponse(
      200,
      "If your email exists and is unverified, a new link has been sent",
      null
    )
  );
});

module.exports = { verifyEmail, resendVerification };