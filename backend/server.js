require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const db = require("./db");
const Crop = require("./models/Crop");
const TelemetryLog = require("./models/TelemetryLog");
const User = require("./models/User");
const authRouter = require("./routes/auth");
const aiRouter = require("./routes/ai");
const { requireAuth } = require("./middleware/auth");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173"
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  const oldJson = res.json;
  res.json = function(data) {
    console.log(`[HTTP] Response status: ${res.statusCode} for ${req.method} ${req.url}`);
    return oldJson.apply(this, arguments);
  };
  next();
});
app.use(passport.initialize());

// Mount Auth routes
app.use("/api/auth", authRouter);
app.use("/api/ai", aiRouter);

// Connect to MongoDB
db.connectDB();

// Root path status check
app.get("/", (req, res) => {
  res.json({
    message: "CropMind Backend Running",
    mode: db.isMock() ? "In-Memory Mock Mode" : "MongoDB Mode"
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Status check endpoint
app.get("/status", (req, res) => {
  res.status(200).json({
    status: "online",
    mode: db.isMock() ? "mock" : "production",
    database: db.isMock() ? "disconnected" : "connected"
  });
});

// API Documentation / Info route
app.get("/docs", (req, res) => {
  res.status(200).json({
    name: "CropMind Backend API",
    version: "1.0.0",
    description: "API for smart farming registry, telemetry tracking, and Gemini AI proxy.",
    endpoints: {
      auth: [
        "POST /api/auth/register - Register new user",
        "POST /api/auth/login - Log in user",
        "POST /api/auth/logout - Log out user",
        "GET /api/auth/google - Initiate Google OAuth",
        "GET /api/auth/google/callback - Google OAuth callback"
      ],
      crops: [
        "GET /api/crops - Get all crops",
        "GET /api/crops/:id - Get single crop details",
        "POST /api/crops - Create a new crop",
        "PUT /api/crops/:id - Update existing crop details",
        "DELETE /api/crops/:id - Delete a crop",
        "GET /api/crops/search/:name - Search crops by name query"
      ],
      telemetry: [
        "GET /api/telemetry - Retrieve recent telemetry logs",
        "POST /api/telemetry - Add new telemetry logs"
      ],
      ai: [
        "POST /api/chat - Proxy chat message to Gemini AI",
        "POST /api/ai/diagnose - Diagnose crop diagnostics via Gemini AI"
      ]
    }
  });
});

// GET all crops from MongoDB or In-Memory Mock Store
app.get("/api/crops", async (req, res) => {
  try {
    if (db.isMock()) {
      return res.status(200).json(db.getMockCrops());
    }
    const crops = await Crop.find().sort({ createdAt: -1 });
    res.status(200).json(crops);
  } catch (error) {
    console.error("Error getting crops:", error);
    res.status(500).json({ message: "Internal server error reading crops" });
  }
});

// GET single crop by ID
app.get("/api/crops/:id", async (req, res) => {
  try {
    if (db.isMock()) {
      const crop = db.getMockCrops().find(c => c.id === req.params.id);
      if (!crop) {
        return res.status(404).json({ message: "Crop not found" });
      }
      return res.status(200).json(crop);
    }
    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: "Crop not found" });
    }
    res.status(200).json(crop);
  } catch (error) {
    console.error("Error getting crop:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST create a new crop
app.post("/api/crops", requireAuth, async (req, res) => {
  try {
    const { name, season, water } = req.body;
    if (!name || !season || !water) {
      return res.status(400).json({ message: "Name, season, and water fields are required" });
    }

    if (db.isMock()) {
      const newCrop = {
        id: "mock-" + Date.now(),
        name,
        season,
        water
      };
      const crops = db.getMockCrops();
      db.setMockCrops([newCrop, ...crops]);
      return res.status(201).json(newCrop);
    }

    const crop = await Crop.create({ name, season, water });
    res.status(201).json(crop);
  } catch (error) {
    console.error("Error creating crop:", error);
    res.status(500).json({ message: "Internal server error creating crop" });
  }
});

// PUT update an existing crop
app.put("/api/crops/:id", requireAuth, async (req, res) => {
  try {
    const { name, season, water } = req.body;

    if (db.isMock()) {
      const crops = db.getMockCrops();
      const cropIndex = crops.findIndex(c => c.id === req.params.id);
      if (cropIndex === -1) {
        return res.status(404).json({ message: "Crop not found" });
      }
      const updatedCrop = {
        ...crops[cropIndex],
        name: name !== undefined ? name : crops[cropIndex].name,
        season: season !== undefined ? season : crops[cropIndex].season,
        water: water !== undefined ? water : crops[cropIndex].water
      };
      crops[cropIndex] = updatedCrop;
      db.setMockCrops(crops);
      return res.status(200).json(updatedCrop);
    }

    const crop = await Crop.findByIdAndUpdate(
      req.params.id,
      { name, season, water },
      { new: true, runValidators: true }
    );
    if (!crop) {
      return res.status(404).json({ message: "Crop not found" });
    }
    res.status(200).json(crop);
  } catch (error) {
    console.error("Error updating crop:", error);
    res.status(500).json({ message: "Internal server error updating crop" });
  }
});

// DELETE a crop
app.delete("/api/crops/:id", requireAuth, async (req, res) => {
  try {
    if (db.isMock()) {
      const crops = db.getMockCrops();
      const exists = crops.some(c => c.id === req.params.id);
      if (!exists) {
        return res.status(404).json({ message: "Crop not found" });
      }
      db.setMockCrops(crops.filter(c => c.id !== req.params.id));
      return res.status(204).send();
    }

    const crop = await Crop.findByIdAndDelete(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: "Crop not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting crop:", error);
    res.status(500).json({ message: "Internal server error deleting crop" });
  }
});

// GET search crops by name query
app.get("/api/crops/search/:name", async (req, res) => {
  try {
    const query = req.params.name.toLowerCase();

    if (db.isMock()) {
      const results = db.getMockCrops().filter(c => c.name.toLowerCase().includes(query));
      return res.status(200).json(results);
    }

    const results = await Crop.find({
      name: { $regex: req.params.name, $options: "i" }
    }).sort({ createdAt: -1 });
    res.status(200).json(results);
  } catch (error) {
    console.error("Error searching crops:", error);
    res.status(500).json({ message: "Internal server error searching crops" });
  }
});

// Telemetry endpoints for persistence
// GET recent telemetry logs
app.get("/api/telemetry", requireAuth, async (req, res) => {
  try {
    if (db.isMock()) {
      return res.status(200).json(db.getMockTelemetry());
    }
    const logs = await TelemetryLog.find().sort({ createdAt: -1 }).limit(30);
    res.status(200).json(logs.reverse());
  } catch (error) {
    console.error("Error getting telemetry logs:", error);
    res.status(500).json({ message: "Error loading telemetry logs" });
  }
});

// POST a new telemetry log
app.post("/api/telemetry", requireAuth, async (req, res) => {
  try {
    const { time, type, text } = req.body;
    if (!time || !type || !text) {
      return res.status(400).json({ message: "Time, type, and text fields are required" });
    }

    if (db.isMock()) {
      const newLog = {
        id: "mock-log-" + Date.now(),
        time,
        type,
        text
      };
      const logs = db.getMockTelemetry();
      db.setMockTelemetry([...logs, newLog]);
      return res.status(201).json(newLog);
    }

    const log = await TelemetryLog.create({ time, type, text });
    res.status(201).json(log);
  } catch (error) {
    console.error("Error creating telemetry log:", error);
    res.status(500).json({ message: "Error saving telemetry log" });
  }
});

// POST chat proxy to Gemini API
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in backend .env file.");
    return res.status(200).json({
      reply: "Hello! I am CropMind AI, but my brain (Gemini API key) is currently not configured on this server. Please set the GEMINI_API_KEY variable in your backend `.env` file to start chatting!"
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are CropMind AI, an AI farming assistant built for Indian farmers.

Your responsibilities:
- Crop recommendations
- Disease identification advice
- Irrigation guidance
- Fertilizer recommendations
- Market price guidance
- Weather based farming advice

Rules:
- Keep answers under 8 bullet points.
- Be concise and practical.
- Assume the user is from India unless specified otherwise.
- If location is missing for weather questions, ask for district and state.
- Mention expert consultation if required.
- Never mention that you are an AI language model.
- Focus only on agriculture and farming topics.

User Question: ${message}`
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini request failed: ${response.status} ${response.statusText}`, errText);
      return res.status(502).json({ message: "Failed to communicate with Gemini API" });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received from AI model.";
    res.status(200).json({ reply });
  } catch (error) {
    console.error("Gemini proxy error:", error);
    res.status(500).json({ message: "Internal server error communicating with AI service" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
