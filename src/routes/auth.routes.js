const express = require("express");
const router = express.Router();

// ── Middlewares ───────────────────────────────────────────────────────────────
const { authenticate } = require("../middlewares/authenticate");
const { authLimiter, resendEmailLimiter } = require("../middlewares/rateLimiter");
const validate = require("../middlewares/validate");

// ── Validators ────────────────────────────────────────────────────────────────
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
} = require("../validators/auth.validators");

// ── Controllers ───────────────────────────────────────────────────────────────
const { register, login, logout, logoutAll, getMe } = require("../controllers/auth.controller");
const { refresh } = require("../controllers/token.controller");
const { verifyEmail, resendVerification } = require("../controllers/verify.controller");
const { forgotPassword, resetPassword, changePassword } = require("../controllers/password.controller");
const { googleRedirect, googleCallback, githubRedirect, githubCallback } = require("../controllers/oauth.controller");


// AUTH ROUTES


// Register & Login
router.post("/register",
  authLimiter,
  validate(registerSchema),
  register
);

router.post("/login",
  authLimiter,
  validate(loginSchema),
  login
);

// Token 
router.post("/refresh",
  refresh
);

// Logout 
router.post("/logout",
  logout
);

router.post("/logout-all",
  authenticate,
  logoutAll
);

// Current user
router.get("/me",
  authenticate,
  getMe
);

// Email verification 
router.post("/verify-email",
  validate({ safeParse: (body) => ({ success: !!body.token, data: body }) }),
  verifyEmail
);

router.post("/resend-verification",
  resendEmailLimiter,
  resendVerification
);

// Password
router.post("/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);

router.post("/reset-password",
  validate(resetPasswordSchema),
  resetPassword
);

router.post("/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePassword
);

// OAuth — Google 
router.get("/oauth/google",
  googleRedirect
);

router.get("/oauth/google/callback",
  googleCallback
);

// OAuth — GitHub 
router.get("/oauth/github",
  githubRedirect
);

router.get("/oauth/github/callback",
  githubCallback
);

module.exports = router;