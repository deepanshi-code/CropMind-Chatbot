const mongoose = require("mongoose");
const Crop = require("./models/Crop");

let isMockDB = false;

// Safe local in-memory fallback store
let mockCrops = [
  { id: "mock-1", name: "Wheat", season: "Rabi", water: "Medium" },
  { id: "mock-2", name: "Rice", season: "Kharif", water: "High" }
];

let mockTelemetry = [
  { id: "mock-t1", time: "20:40:01", type: "system", text: "Sensor logs initialized (Mock DB Mode)." },
  { id: "mock-t2", time: "20:40:15", type: "info", text: "Database: Local MongoDB connection timed out. Running in Mock Mode." },
  { id: "mock-t3", time: "20:41:00", type: "success", text: "System: Local in-memory crop registry prepared." }
];

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cropmind";
  
  try {
    // Attempt connection with a short timeout to prevent blocking dev server startup
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log("MongoDB connected successfully.");
    
    // Seed initial crops if database is empty
    const count = await Crop.countDocuments();
    if (count === 0) {
      await Crop.create([
        { name: "Wheat", season: "Rabi", water: "Medium" },
        { name: "Rice", season: "Kharif", water: "High" }
      ]);
      console.log("MongoDB seeded successfully with initial crops.");
    }
  } catch (error) {
    console.log("-------------------------------------------------------------------");
    console.warn("⚠️  DATABASE CONNECTION WARNING:");
    console.warn(`Could not connect to MongoDB at "${mongoURI}".`);
    console.warn("Backend will boot in IN-MEMORY MOCK MODE for development.");
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
  setMockTelemetry: (val) => { mockTelemetry = val; }
};
