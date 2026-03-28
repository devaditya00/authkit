require("dotenv").config();
const app = require("./server");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 3000;

// ── Unhandled promise rejections ──────────────────────────────────────────────
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  process.exit(1);
});

// ── Uncaught exceptions ───────────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

// ── Boot sequence ─────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`🚀 AuthKit running on port ${PORT} [${process.env.NODE_ENV}]`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      console.log("✅ HTTP server closed");

      const mongoose = require("mongoose");
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");

      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
};

start();
