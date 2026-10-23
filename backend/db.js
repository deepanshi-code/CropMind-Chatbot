const mongoose = require("mongoose");
const { isProduction } = require("./config");

let isMockDB = false;

// Local in-memory store for development without MongoDB. Records carry an owner id,
// so each user starts with an empty catalog, same as in MongoDB mode.
let mockCrops = [];
let mockTelemetry = [];
let mockUsers = [];

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cropmind";

  try {
    // Attempt connection with a short timeout to prevent blocking dev server startup
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: isProduction ? 15000 : 3000
    });
    console.log("MongoDB connected successfully.");
  } catch (error) {
    if (isProduction) {
      // Falling back to memory in production would silently lose every account and crop on restart.
      console.error("FATAL: Could not connect to MongoDB in production:", error.message);
      process.exit(1);
    }
    console.log("-------------------------------------------------------------------");
    console.warn("⚠️  DATABASE CONNECTION WARNING:");
    console.warn("Could not connect to MongoDB.");
    console.warn("Backend will boot in IN-MEMORY MOCK MODE for development. Data is lost on restart.");
    console.warn("Define MONGO_URI in your backend `.env` file to connect a real database.");
    console.log("-------------------------------------------------------------------");
    isMockDB = true;
  }
};

module.exports = {
  connectDB,
  isMock: () => isMockDB,
  getMockCrops: () => mockCrops,
  setMockCrops: (val) => { mockCrops = val; },
  getMockTelemetry: () => mockTelemetry,
  setMockTelemetry: (val) => { mockTelemetry = val; },
  getMockUsers: () => mockUsers,
  setMockUsers: (val) => { mockUsers = val; }
};
