const transporter = require("../config/email");
const ApiError = require("../utils/ApiError");

//  Base mail sender 
const sendMail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"AuthKit" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email send failed:", err.message);
    throw new ApiError(500, "Failed to send email. Please try again later");
  }
};

//Email verification 
const sendVerificationEmail = async (user, rawToken) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#111827;margin-bottom:8px;">Verify your email</h2>
      <p style="color:#6b7280;margin-bottom:24px;">Hi ${user.name}, click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
      <a href="${verifyUrl}"
         style="display:inline-block;background:#111827;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
        Verify Email
      </a>
      <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
        Or copy this link:<br/>
        <span style="color:#6b7280;word-break:break-all;">${verifyUrl}</span>
      </p>
      <p style="color:#d1d5db;font-size:12px;margin-top:32px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
  `;

  await sendMail({
    to: user.email,
    subject: "Verify your email — AuthKit",
    html,
  });
};

// Password reset
const sendPasswordResetEmail = async (user, rawToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#111827;margin-bottom:8px;">Reset your password</h2>
      <p style="color:#6b7280;margin-bottom:24px;">Hi ${user.name}, we received a request to reset your password. Click below to set a new one. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#111827;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
        Reset Password
      </a>
      <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
        Or copy this link:<br/>
        <span style="color:#6b7280;word-break:break-all;">${resetUrl}</span>
      </p>
      <p style="color:#d1d5db;font-size:12px;margin-top:32px;">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
    </div>
  `;

  await sendMail({
    to: user.email,
    subject: "Reset your password — AuthKit",
    html,
  });
};

// Welcome email (sent after verification)
const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#111827;margin-bottom:8px;">Welcome to AuthKit </h2>
      <p style="color:#6b7280;margin-bottom:24px;">Hi ${user.name}, your email has been verified. You're all set!</p>
      <p style="color:#d1d5db;font-size:12px;margin-top:32px;">If you have any questions, just reply to this email.</p>
    </div>
  `;

  await sendMail({
    to: user.email,
    subject: "Welcome to AuthKit!",
    html,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};