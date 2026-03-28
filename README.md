# AuthKit

A production-grade authentication microservice built with Node.js, Express,
MongoDB, JWT, and Zod. Drop it into any project and get full auth instantly.

## Features

- JWT authentication with access + refresh tokens
- Refresh token rotation with reuse detection
- Email verification
- Password reset via email
- Change password
- OAuth 2.0 — Google & GitHub
- Role-based access control
- Rate limiting & brute-force protection
- Zod request validation
- Helmet security headers

## Stack

| Layer      | Technology              |
|------------|-------------------------|
| Runtime    | Node.js 18+             |
| Framework  | Express                 |
| Database   | MongoDB + Mongoose      |
| Auth       | JWT (jsonwebtoken)      |
| Validation | Zod                     |
| Email      | Nodemailer              |
| OAuth      | Google, GitHub          |
| Security   | Helmet, CORS, bcryptjs  |

## Getting started

### 1. Clone and install
\`\`\`bash
git clone https://github.com/yourname/authkit.git
cd authkit
npm install
\`\`\`

### 2. Configure environment
\`\`\`bash
cp .env.example .env
\`\`\`
Fill in your values in `.env`

### 3. Run
\`\`\`bash
# development
npm run dev

# production
npm start
\`\`\`

### 4. Test
\`\`\`bash
npm test
\`\`\`

## API Reference

| Method | Endpoint                        | Auth | Description              |
|--------|---------------------------------|------|--------------------------|
| POST   | /api/auth/register              | —    | Register new user        |
| POST   | /api/auth/login                 | —    | Login                    |
| POST   | /api/auth/refresh               | —    | Refresh access token     |
| POST   | /api/auth/logout                | —    | Logout current device    |
| POST   | /api/auth/logout-all            | 🔒   | Logout all devices       |
| GET    | /api/auth/me                    | 🔒   | Get current user         |
| POST   | /api/auth/verify-email          | —    | Verify email             |
| POST   | /api/auth/resend-verification   | —    | Resend verification      |
| POST   | /api/auth/forgot-password       | —    | Request password reset   |
| POST   | /api/auth/reset-password        | —    | Reset password           |
| POST   | /api/auth/change-password       | 🔒   | Change password          |
| GET    | /api/auth/oauth/google          | —    | Google OAuth redirect    |
| GET    | /api/auth/oauth/google/callback | —    | Google OAuth callback    |
| GET    | /api/auth/oauth/github          | —    | GitHub OAuth redirect    |
| GET    | /api/auth/oauth/github/callback | —    | GitHub OAuth callback    |
| GET    | /health                         | —    | Health check             |

## Project structure

\`\`\`
src/
├── config/        # DB and email setup
├── models/        # Mongoose schemas
├── validators/    # Zod schemas
├── middlewares/   # Auth, rate limit, validate, error handler
├── services/      # Token, email, OAuth logic
├── controllers/   # Route handlers
├── routes/        # Express router
└── utils/         # ApiError, ApiResponse, asyncHandler, crypto




