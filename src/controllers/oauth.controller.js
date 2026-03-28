const User = require("../models/User.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { getGoogleAuthUrl, getGoogleUser, getGithubAuthUrl, getGithubUser } = require("../services/oauth.service");
const { issueTokenPair } = require("../services/token.service");

// ── helper: find or create user from OAuth profile ───────────────────────────
const findOrCreateOAuthUser = async (profile) => {
  // Step 1: try to find by oauthId + provider
  let user = await User.findOne({
    oauthId: profile.oauthId,
    oauthProvider: profile.oauthProvider,
  });

  if (user) return user;

  // Step 2: try to find by email (user may have registered locally)
  user = await User.findOne({ email: profile.email });

  if (user) {
    // link OAuth to existing local account
    user.oauthId = profile.oauthId;
    user.oauthProvider = profile.oauthProvider;
    user.avatar = user.avatar || profile.avatar;
    user.isVerified = true; // OAuth providers verify email
    await user.save({ validateBeforeSave: false });
    return user;
  }

  // Step 3: create brand new user
  user = await User.create({
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar,
    oauthId: profile.oauthId,
    oauthProvider: profile.oauthProvider,
    isVerified: true, // OAuth email is already verified by provider
    password: undefined, // no password for OAuth users
  });

  return user;
};

// ── Google: redirect to consent screen ───────────────────────────────────────
const googleRedirect = asyncHandler(async (req, res) => {
  const url = getGoogleAuthUrl();
  return res.redirect(url);
});

// ── Google: handle callback ───────────────────────────────────────────────────
const googleCallback = asyncHandler(async (req, res) => {
  const { code, error } = req.query;

  // user denied permission on Google's screen
  if (error || !code) {
    return res.redirect(
      `${process.env.CLIENT_URL}/login?error=oauth_denied`
    );
  }

  // Step 1: exchange code for user profile
  const profile = await getGoogleUser(code);

  // Step 2: find or create user
  const user = await findOrCreateOAuthUser(profile);

  // Step 3: issue token pair
  const { accessToken, refreshToken } = await issueTokenPair(user, {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  // Step 4: set refresh token cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Step 5: redirect to frontend with access token in query
  return res.redirect(
    `${process.env.CLIENT_URL}/oauth/callback?accessToken=${accessToken}`
  );
});

// ── GitHub: redirect to consent screen ───────────────────────────────────────
const githubRedirect = asyncHandler(async (req, res) => {
  const url = getGithubAuthUrl();
  return res.redirect(url);
});

// ── GitHub: handle callback ───────────────────────────────────────────────────
const githubCallback = asyncHandler(async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(
      `${process.env.CLIENT_URL}/login?error=oauth_denied`
    );
  }

  // Step 1: exchange code for user profile
  const profile = await getGithubUser(code);

  // Step 2: find or create user
  const user = await findOrCreateOAuthUser(profile);

  // Step 3: issue token pair
  const { accessToken, refreshToken } = await issueTokenPair(user, {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  // Step 4: set refresh token cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Step 5: redirect to frontend with access token
  return res.redirect(
    `${process.env.CLIENT_URL}/oauth/callback?accessToken=${accessToken}`
  );
});

module.exports = {
  googleRedirect,
  googleCallback,
  githubRedirect,
  githubCallback,
};