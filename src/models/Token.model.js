const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    //Refresh Token
    refreshToken: {
      type: String,
      default: null,
    },

    refreshTokenExpiresAt: {
      type: Date,
      default: null,
    },

    isRefreshTokenRevoked: {
      type: Boolean,
      default: false,
    },

    //Email Verification Token
    emailVerificationToken: {
      type: String,
      default: null,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
    },

    //Password Reset Token
    passwordResetToken: {
      type: String,
      default: null,
    },

    passwordResetExpiresAt: {
      type: Date,
      default: null,
    },

    //Token family for refresh token rotation
    family: {
      type: String,
      default: null,
      index: true,
    },

    //Device / session info (optional but useful)
    userAgent: {
      type: String,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

//TTL index: auto-delete expired refresh token documents
tokenSchema.index(
  { refreshTokenExpiresAt: 1 },
  { expireAfterSeconds: 0 }
);

//Static: revoke all tokens for a user (logout all devices)
tokenSchema.statics.revokeAllForUser = async function (userId) {
  return this.updateMany(
    { userId, isRefreshTokenRevoked: false },
    { isRefreshTokenRevoked: true }
  );
};

//Static: revoke entire token family (theft detected)
tokenSchema.statics.revokeFamilyTokens = async function (family) {
  return this.updateMany(
    { family },
    { isRefreshTokenRevoked: true }
  );
};

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;