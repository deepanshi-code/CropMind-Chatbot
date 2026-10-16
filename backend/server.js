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
].filter(Boolean).map(url => url.replace(/\/$/, ""));

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin ? origin.replace(/\/$/, "") : "";
    if (!origin || allowedOrigins.includes(normalizedOrigin) || normalizedOrigin.startsWith("http://localhost:")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CropMind Developer API Portal</title>
      <style>
        :root {
          --bg: #030712;
          --panel: #0b1329;
          --border: #1e293b;
          --accent: #10b981;
          --accent-glow: rgba(16, 185, 129, 0.15);
          --text: #cbd5e1;
          --text-muted: #64748b;
          --get: #38bdf8;
          --post: #34d399;
          --put: #fbbf24;
          --delete: #f87171;
        }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: var(--bg);
          color: var(--text);
          line-height: 1.6;
        }
        header {
          background: linear-gradient(180deg, var(--accent-glow), transparent);
          border-bottom: 1px solid var(--border);
          padding: 60px 20px;
          text-align: center;
        }
        .logo {
          display: inline-block;
          background: var(--accent-glow);
          border: 1px solid var(--accent);
          color: var(--accent);
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
        }
        header h1 {
          margin: 0 0 12px 0;
          font-size: 36px;
          color: white;
          font-weight: 800;
          letter-spacing: -1px;
        }
        header p {
          margin: 0 auto;
          max-width: 600px;
          color: var(--text-muted);
          font-size: 16px;
        }
        .container {
          max-width: 900px;
          margin: 40px auto;
          padding: 0 20px 80px 20px;
        }
        .section-title {
          font-size: 22px;
          font-weight: 700;
          margin: 40px 0 20px 0;
          color: white;
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
        }
        .endpoint-card {
          background-color: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          margin-bottom: 24px;
          overflow: hidden;
          box-shadow: 0 4px 25px rgba(0,0,0,0.4);
        }
        .endpoint-header {
          padding: 18px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255,255,255,0.01);
          border-bottom: 1px solid var(--border);
        }
        .method {
          font-size: 12px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .method.get { background: rgba(56, 189, 248, 0.1); color: var(--get); border: 1px solid rgba(56, 189, 248, 0.2); }
        .method.post { background: rgba(52, 211, 153, 0.1); color: var(--post); border: 1px solid rgba(52, 211, 153, 0.2); }
        .method.put { background: rgba(251, 191, 36, 0.1); color: var(--put); border: 1px solid rgba(251, 191, 36, 0.2); }
        .method.delete { background: rgba(248, 113, 113, 0.1); color: var(--delete); border: 1px solid rgba(248, 113, 113, 0.2); }
        .path {
          font-family: 'Courier New', Courier, monospace;
          font-size: 16px;
          font-weight: 700;
          color: white;
        }
        .desc {
          color: var(--text-muted);
          font-size: 14px;
          margin-left: auto;
        }
        .endpoint-body {
          padding: 24px;
        }
        .meta-list {
          margin-bottom: 16px;
        }
        .meta-item {
          display: flex;
          font-size: 14px;
          margin-bottom: 8px;
        }
        .meta-label {
          font-weight: 600;
          color: var(--text-muted);
          width: 140px;
          flex-shrink: 0;
        }
        .meta-value {
          color: var(--text);
        }
        .auth-badge {
          background: rgba(248, 113, 113, 0.1);
          color: var(--delete);
          border: 1px solid rgba(248, 113, 113, 0.2);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .auth-badge.none {
          background: rgba(52, 211, 153, 0.1);
          color: var(--post);
          border: 1px solid rgba(52, 211, 153, 0.2);
        }
        .example-header {
          font-size: 12px;
          font-weight: bold;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 16px 0 6px 0;
        }
        pre {
          background: #020617;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
          margin: 0;
        }
        code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          color: #34d399;
        }
        .footer {
          text-align: center;
          padding: 40px;
          color: var(--text-muted);
          font-size: 13px;
          border-top: 1px solid var(--border);
        }
      </style>
    </head>
    <body>
      <header>
        <div class="logo">CropMind Core Engine</div>
        <h1>Developer API Portal</h1>
        <p>Complete documentation for the CropMind backend services. Connect to authentication, manage crop datasets, log IoT sensor telemetry, and interface with Google's Gemini AI.</p>
      </header>

      <div class="container">
        <!-- AUTH SERVICE -->
        <div class="section-title">Authentication Endpoints</div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method post">POST</span>
            <span class="path">/api/auth/register</span>
            <span class="desc">Register a new farmer account</span>
          </div>
          <div class="endpoint-body">
            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Authentication</span><span class="meta-value"><span class="auth-badge none">None Required</span></span></div>
              <div class="meta-item"><span class="meta-label">Rate Limit</span><span class="meta-value">5 requests / min</span></div>
            </div>
            <div class="example-header">Request Payload (JSON)</div>
            <pre><code>{
  "email": "farmer@cropmind.com",
  "password": "securepassword123"
}</code></pre>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method post">POST</span>
            <span class="path">/api/auth/login</span>
            <span class="desc">Authenticate credentials and generate token</span>
          </div>
          <div class="endpoint-body">
            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Authentication</span><span class="meta-value"><span class="auth-badge none">None Required</span></span></div>
              <div class="meta-item"><span class="meta-label">Rate Limit</span><span class="meta-value">5 requests / min</span></div>
            </div>
            <div class="example-header">Response Body (JSON)</div>
            <pre><code>{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "603d2e9c15b...",
    "email": "farmer@cropmind.com"
  }
}</code></pre>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method get">GET</span>
            <span class="path">/api/auth/google</span>
            <span class="desc">Initiate Google OAuth flow</span>
          </div>
          <div class="endpoint-body">
            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Authentication</span><span class="meta-value"><span class="auth-badge none">OAuth Redirect</span></span></div>
              <div class="meta-item"><span class="meta-label">Description</span><span class="meta-value">Redirects the user to Google Login. Automatically falls back to Developer Sandbox OAuth consent screen if client credentials are not defined.</span></div>
            </div>
          </div>
        </div>

        <!-- CROP REGISTRY -->
        <div class="section-title">Crop Registry Endpoints</div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method get">GET</span>
            <span class="path">/api/crops</span>
            <span class="desc">Retrieve all registered crops</span>
          </div>
          <div class="endpoint-body">
            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Authentication</span><span class="meta-value"><span class="auth-badge none">None Required</span></span></div>
            </div>
            <div class="example-header">Response Body (JSON)</div>
            <pre><code>[
  {
    "_id": "603d2e9c15b...",
    "name": "Basmati Rice",
    "season": "Kharif",
    "water": "High",
    "createdAt": "2026-07-28T16:00:00.000Z"
  }
]</code></pre>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method post">POST</span>
            <span class="path">/api/crops</span>
            <span class="desc">Create a new crop entry</span>
          </div>
          <div class="endpoint-body">
            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Authentication</span><span class="meta-value"><span class="auth-badge">Bearer JWT Token</span></span></div>
            </div>
            <div class="example-header">Request Payload (JSON)</div>
            <pre><code>{
  "name": "Kanak Wheat",
  "season": "Rabi",
  "water": "Medium"
}</code></pre>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method put">PUT</span>
            <span class="path">/api/crops/:id</span>
            <span class="desc">Modify details of an existing crop</span>
          </div>
          <div class="endpoint-body">
            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Authentication</span><span class="meta-value"><span class="auth-badge">Bearer JWT Token</span></span></div>
            </div>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method delete">DELETE</span>
            <span class="path">/api/crops/:id</span>
            <span class="desc">Delete a crop entry</span>
          </div>
          <div class="endpoint-body">
            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Authentication</span><span class="meta-value"><span class="auth-badge">Bearer JWT Token</span></span></div>
            </div>
          </div>
        </div>

        <!-- TELEMETRY -->
        <div class="section-title">Telemetry Sensor Logs</div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method get">GET</span>
            <span class="path">/api/telemetry</span>
            <span class="desc">Get the 30 most recent logs</span>
          </div>
          <div class="endpoint-body">
            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Authentication</span><span class="meta-value"><span class="auth-badge">Bearer JWT Token</span></span></div>
            </div>
          </div>
        </div>

        <!-- AI ADVISOR -->
        <div class="section-title">AI Assistant & Chat Proxy</div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method post">POST</span>
            <span class="path">/api/chat</span>
            <span class="desc">Get AI farming recommendations</span>
          </div>
          <div class="endpoint-body">
            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Authentication</span><span class="meta-value"><span class="auth-badge none">None Required</span></span></div>
              <div class="meta-item"><span class="meta-label">AI Engine</span><span class="meta-value">Gemini 2.5 Flash Proxy</span></div>
            </div>
            <div class="example-header">Request Payload (JSON)</div>
            <pre><code>{
  "message": "When should I irrigate my Rabi wheat?"
}</code></pre>
          </div>
        </div>
      </div>

      <div class="footer">
        &copy; 2026 CropMind. All rights reserved. Managed Production API Portal.
      </div>
    </body>
    </html>
  `);
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
