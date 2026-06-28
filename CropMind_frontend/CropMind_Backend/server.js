const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

let crops = [
  { id: 1, name: "Wheat", season: "Rabi", water: "Medium" },
  { id: 2, name: "Rice", season: "Kharif", water: "High" }
];

app.get("/", (req, res) => {
  res.json({ message: "CropMind Backend Running" });
});

app.get("/api/crops", (req, res) => res.status(200).json(crops));

app.get("/api/crops/:id", (req, res) => {
  const crop = crops.find(c => c.id == req.params.id);
  if (!crop) return res.status(404).json({ message: "Crop not found" });
  res.status(200).json(crop);
});

app.post("/api/crops", (req, res) => {
  const crop = { id: Date.now(), ...req.body };
  crops.push(crop);
  res.status(201).json(crop);
});

app.put("/api/crops/:id", (req, res) => {
  const index = crops.findIndex(c => c.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Crop not found" });
  crops[index] = { ...crops[index], ...req.body };
  res.status(200).json(crops[index]);
});

app.delete("/api/crops/:id", (req, res) => {
  crops = crops.filter(c => c.id != req.params.id);
  res.status(204).send();
});

app.get("/api/crops/search/:name", (req, res) => {
  const results = crops.filter(c =>
    c.name.toLowerCase().includes(req.params.name.toLowerCase())
  );
  res.status(200).json(results);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
