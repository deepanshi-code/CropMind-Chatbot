const express = require("express");
const cors = require("cors");
const db = require("./db");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Root path status check
app.get("/", (req, res) => {
  res.json({ message: "CropMind Backend Running" });
});

// GET all crops from SQLite database
app.get("/api/crops", (req, res) => {
  try {
    const crops = db.getAllCrops();
    res.status(200).json(crops);
  } catch (error) {
    console.error("Error getting crops:", error);
    res.status(500).json({ message: "Internal server error reading crops" });
  }
});

// GET single crop by ID
app.get("/api/crops/:id", (req, res) => {
  try {
    const crop = db.getCropById(req.params.id);
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
app.post("/api/crops", (req, res) => {
  try {
    const { name, season, water } = req.body;
    if (!name || !season || !water) {
      return res.status(400).json({ message: "Name, season, and water fields are required" });
    }
    const crop = db.createCrop(name, season, water);
    res.status(201).json(crop);
  } catch (error) {
    console.error("Error creating crop:", error);
    res.status(500).json({ message: "Internal server error creating crop" });
  }
});

// PUT update an existing crop
app.put("/api/crops/:id", (req, res) => {
  try {
    const { name, season, water } = req.body;
    const crop = db.updateCrop(req.params.id, name, season, water);
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
app.delete("/api/crops/:id", (req, res) => {
  try {
    const success = db.deleteCrop(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Crop not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting crop:", error);
    res.status(500).json({ message: "Internal server error deleting crop" });
  }
});

// GET search crops by name query
app.get("/api/crops/search/:name", (req, res) => {
  try {
    const results = db.searchCrops(req.params.name);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error searching crops:", error);
    res.status(500).json({ message: "Internal server error searching crops" });
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
