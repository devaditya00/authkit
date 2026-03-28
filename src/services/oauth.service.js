const axios = require("axios");
const ApiError = require("../utils/ApiError");

// Google OAuth

const getGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

const getGoogleUser = async (code) => {
  // Step 1: exchange code for tokens
  const tokenRes = await axios.post(
    "https://oauth2.googleapis.com/token",
    {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }
  );

  const { access_token, id_token } = tokenRes.data;

  if (!access_token) {
    throw new ApiError(400, "Failed to exchange Google code for token");
  }

  // Step 2: fetch user profile using access token
  const userRes = await axios.get(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  return {
    oauthId: userRes.data.sub,        // Google's unique user ID
    name: userRes.data.name,
    email: userRes.data.email,
    avatar: userRes.data.picture,
    oauthProvider: "google",
  };
};

// GitHub OAuth

const getGithubAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
    scope: "user:email",
  });

  return `https://github.com/login/oauth/authorize?${params}`;
};

const getGithubUser = async (code) => {
  // Step 1: exchange code for access token
  const tokenRes = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      redirect_uri: process.env.GITHUB_REDIRECT_URI,
      code,
    },
    { headers: { Accept: "application/json" } }
  );

  const { access_token } = tokenRes.data;

  if (!access_token) {
    throw new ApiError(400, "Failed to exchange GitHub code for token");
  }

  // Step 2: fetch user profile
  const userRes = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  // Step 3: GitHub may hide email — fetch it separately
  let email = userRes.data.email;

  if (!email) {
    const emailRes = await axios.get(
      "https://api.github.com/user/emails",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const primaryEmail = emailRes.data.find(
      (e) => e.primary && e.verified
    );

    if (!primaryEmail) {
      throw new ApiError(400, "No verified email found on GitHub account");
    }

    email = primaryEmail.email;
  }

  return {
    oauthId: String(userRes.data.id),  // GitHub's unique user ID
    name: userRes.data.name || userRes.data.login,
    email,
    avatar: userRes.data.avatar_url,
    oauthProvider: "github",
  };
};

module.exports = {
  getGoogleAuthUrl,
  getGoogleUser,
  getGithubAuthUrl,
  getGithubUser,
};
