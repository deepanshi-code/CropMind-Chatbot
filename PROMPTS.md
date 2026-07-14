# AI Prompt Engineering Log - Crop Diagnostics

This log documents the prompt iteration process for the AI Crop Diagnostics & Treatment Advisor. The feature queries the Google Gemini API to analyze crop name, observed symptoms, and optional environmental metrics, returning a structured treatment plan.

---

## Prompt Variation 1: Freeform Markdown Response
### System Prompt / Instructions:
```
You are an AI agricultural assistant. Please diagnose the crop issue described by the user. Explain what the likely cause is and list treatment steps.
```

### Example Input:
- **Crop**: Tomato
- **Symptoms**: Yellow spots on leaves and some leaves are curling at the edges.

### Example Output:
```
Based on the symptoms described (yellow spots on leaves and leaf curling at the edges), your tomato plants might be suffering from Early Blight or a deficiency in key nutrients like Nitrogen. 

Here are the suggested treatment steps:
1. Prune affected lower leaves to prevent spread of spores.
2. Apply fungicide if it's early blight.
3. Check soil moisture and fertilizer levels.
```

### Evaluation & Critique:
- **Pros**: Simple to set up; generates quick human-readable output.
- **Cons**: High variability in output formatting. Hard to parse on the backend to render structured UI components (such as separate lists for treatment, prevention, or numeric confidence values).

---

## Prompt Variation 2: Structured Block Layout
### System Prompt / Instructions:
```
You are an expert crop consultant. Diagnose the crop issue based on the inputs: Crop Name, Symptoms, Soil Type, and Moisture Level.
Format your response exactly as follows:
DIAGNOSIS: [Diagnosis here]
SEVERITY: [High/Medium/Low]
CONFIDENCE: [Number between 0 and 100]
TREATMENT PLAN:
- [Step 1]
- [Step 2]
PREVENTATIVE STEPS:
- [Step 1]
- [Step 2]
```

### Example Input:
- **Crop**: Wheat
- **Symptoms**: Wilting and white powdery substance on stems.

### Example Output:
```
DIAGNOSIS: Powdery Mildew
SEVERITY: Medium
CONFIDENCE: 85
TREATMENT PLAN:
- Apply a sulfur-based fungicide immediately.
- Reduce overhead irrigation to decrease foliage dampness.
PREVENTATIVE STEPS:
- Ensure adequate spacing between wheat crops for air circulation.
- Select mildew-resistant seeds for the next Rabi crop.
```

### Evaluation & Critique:
- **Pros**: Easier to parse than Variation 1 since labels are consistent.
- **Cons**: Regular expression parsers on the backend can still break if the model uses slightly different headers, adds conversational intro text ("Here is your diagnosis:"), or wraps titles in markdown formatting.

---

## Prompt Variation 3: Strict JSON Output (Selected)
### System Prompt / Instructions:
```
You are an expert agronomist specialized in Indian agriculture. Diagnose the crop issue based on the user's provided inputs: Crop, Symptoms, Soil Type, and Moisture/Watering Context.

You MUST respond with a single valid JSON object containing exactly the keys detailed below. Do not output any markdown code blocks, backticks, conversational preamble, or tail commentary. Only return pure, parseable JSON.

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
}
```

### Example Input:
- **Crop**: Cotton
- **Symptoms**: Reddening of leaves and dropping of cotton bolls early in the season. Soil is clayey.

### Example Output:
```json
{
  "diagnosis": "Red Leaf Disease (Lalya) / Nitrogen Deficiency",
  "confidence": 88,
  "severity": "High",
  "treatment": [
    "Foliar spray of 2% Urea at 15-day intervals.",
    "Spray 1% Magnesium Sulfate to counteract redness caused by magnesium deficiency.",
    "Improve drainage to avoid waterlogging in clayey soil."
  ],
  "prevention": [
    "Apply balanced NPK fertilizers based on soil test recommendations.",
    "Avoid water stress during flowering and boll development phases.",
    "Practice crop rotation with legumes."
  ],
  "fertilizerIrrigationGuidance": "Reduce heavy irrigation to prevent root hypoxia in clayey soil, and prioritize nitrogen-magnesium inputs to restore leaf health."
}
```

### Evaluation & Critique (Why Variation 3 Worked Best):
- **Pros**: The output is highly structured and reliably parsed using standard `JSON.parse()`. No regex parsing or markdown rendering quirks are encountered. This enables the frontend to build a beautiful visual panel with custom checkboxes for treatment steps, color-coded severity labels (red/orange/green), and animated progress indicators for confidence scores.
- **Cons**: Requires clear instructions and error-catching on the backend in case the JSON string is slightly malformed, but Gemini handles it extremely well when strict system guidelines are provided.
