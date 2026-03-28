require("dotenv").config();
const request = require("supertest");
const app = require("../src/server");
const User = require("../src/models/User.model");

describe("Auth — Register", () => {
  const validUser = {
    name: "John Doe",
    email: "john@example.com",
    password: "Test@1234",
  };

  it("should register a new user successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(validUser.email);
  });

  it("should not register with duplicate email", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app).post("/api/auth/register").send(validUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("should fail with weak password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, password: "weak" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("should fail with invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "not-an-email" });

    expect(res.statusCode).toBe(400);
  });
});

describe("Auth — Login", () => {
  beforeEach(async () => {
    // create and verify a user before each login test
    await request(app).post("/api/auth/register").send({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "Test@1234",
    });

    // manually verify the user in DB
    await User.findOneAndUpdate(
      { email: "jane@example.com" },
      { isVerified: true }
    );
  });

  it("should login with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "jane@example.com", password: "Test@1234" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe("jane@example.com");
  });

  it("should not login with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "jane@example.com", password: "Wrong@1234" });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should not login unverified user", async () => {
    await User.findOneAndUpdate(
      { email: "jane@example.com" },
      { isVerified: false }
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "jane@example.com", password: "Test@1234" });

    expect(res.statusCode).toBe(403);
  });
});

describe("Auth — Protected route", () => {
  let accessToken;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "Test@1234",
    });

    await User.findOneAndUpdate(
      { email: "test@example.com" },
      { isVerified: true }
    );

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "Test@1234" });

    accessToken = loginRes.body.data.accessToken;
  });

  it("should access /me with valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe("test@example.com");
  });

  it("should reject /me without token", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.statusCode).toBe(401);
  });

  it("should reject /me with invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.statusCode).toBe(401);
  });
});