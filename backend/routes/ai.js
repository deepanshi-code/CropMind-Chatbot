const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

// Rate limit specifically for AI to prevent API abuse
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 requests per windowMs
  message: { message: "Too many requests to the AI Advisor, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/diagnose", requireAuth, aiLimiter, async (req, res) => {
  const { cropName, symptoms, soilType, wateringFrequency } = req.body;

  if (!cropName || !cropName.trim()) {
    return res.status(400).json({ message: "Crop name is required" });
  }
  if (!symptoms || !symptoms.trim()) {
    return res.status(400).json({ message: "Symptoms description is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in backend .env file.");
    return res.status(200).json({
      diagnosis: "Mock Diagnostic Report (No API Key Configured)",
      confidence: 95,
      severity: "Medium",
      treatment: [
        "Set the GEMINI_API_KEY environment variable in your backend `.env` file to retrieve live diagnostics.",
        "Restart the backend server after updating your `.env` configuration.",
        "Verify your network connection to the Google Generative Language service."
      ],
      prevention: [
        "Do not push sensitive configuration files (like `.env`) to public repositories.",
        "Review git status regularly to verify active filters."
      ],
      fertilizerIrrigationGuidance: "AI advisor is running in mock verification mode. Please provide a valid Gemini key to enable live agronomic reasoning."
    });
  }

  // Construct prompt instruct Gemini to output structured JSON
  const systemPrompt = `You are an expert agronomist specialized in Indian agriculture. Diagnose the crop issue based on the user's provided inputs:
- Crop: ${cropName}
- Symptoms: ${symptoms}
${soilType ? `- Soil Type: ${soilType}` : ""}
${wateringFrequency ? `- Watering/Irrigation Frequency: ${wateringFrequency}` : ""}

You MUST respond with a single valid JSON object containing exactly the keys detailed below. Do not output any markdown code blocks (such as \`\`\`json ... \`\`\`), backticks, conversational preamble, or tail commentary. Only return pure, parseable JSON.

JSON Structure:
{
  "diagnosis": "Short, clear diagnosis title",
  "confidence": <integer representing confidence percentage from 0 to 100>,
  "severity": "<High|Medium|Low>",
  "treatment": [
    "Step-by-step action item 1",
    "Step-by-step action item 2"
  ],
  "prevention": [
    "Preventative recommendation 1",
    "Preventative recommendation 2"
  ],
  "fertilizerIrrigationGuidance": "Advice regarding watering and fertilizer adjustments based on symptoms and crop properties"
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout limit

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
                  text: systemPrompt
                }
              ]
            }
          ]
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini request failed: ${response.status} ${response.statusText}`, errText);
      return res.status(502).json({ message: "Failed to communicate with AI API. Please try again later." });
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({ message: "Empty response received from the AI model." });
    }

    text = text.trim();
    // Strip markdown code block wrapping if the model ignored request for pure JSON
    if (text.startsWith("```json")) {
      text = text.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (text.startsWith("```")) {
      text = text.replace(/^```/, "").replace(/```$/, "").trim();
    }

    try {
      const parsedData = JSON.parse(text);
      res.status(200).json(parsedData);
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON response. Raw text was:", text, parseErr);
      res.status(502).json({
        message: "The AI model returned an unstructured response. Please try submitting again.",
        raw: text
      });
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Gemini API call timed out after 15s.");
      return res.status(504).json({ message: "AI response timed out. Please try again." });
    }
    console.error("Gemini AI router error:", error);
    res.status(500).json({ message: "Internal server error communicating with the AI service." });
  }
});

module.exports = router;
