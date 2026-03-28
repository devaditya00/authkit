const mongoose = require("mongoose");

// connect to test DB before all tests
beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI_TEST || "mongodb://localhost:27017/authkit_test"
  );
});

// clean all collections before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// disconnect after all tests
afterAll(async () => {
  await mongoose.connection.close();
});