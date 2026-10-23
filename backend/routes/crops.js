const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const db = require("../db");
const Crop = require("../models/Crop");
const { requireAuth } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");

const router = express.Router();

// Crops are private to the user who created them.
router.use(requireAuth);

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Mock-mode records carry the same owner field as MongoDB ones.
const ownMockCrops = (req) => db.getMockCrops().filter(c => c.owner === req.user.id);

// In MongoDB mode a malformed id would throw a CastError (500); treat it as "not found".
const isUnknownId = (id) => !db.isMock() && !mongoose.isValidObjectId(id);

// GET all crops of the logged-in user
router.get("/", async (req, res) => {
  try {
    if (db.isMock()) {
      return res.status(200).json(ownMockCrops(req));
    }
    const crops = await Crop.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(crops);
  } catch (error) {
    console.error("Error getting crops:", error);
    res.status(500).json({ message: "Internal server error reading crops" });
  }
});

// GET search crops by name query
router.get("/search/:name", async (req, res) => {
  const query = req.params.name.trim().slice(0, 60);
  try {
    if (db.isMock()) {
      const lower = query.toLowerCase();
      return res.status(200).json(ownMockCrops(req).filter(c => c.name.toLowerCase().includes(lower)));
    }
    // Escape the input so it is matched literally and cannot be used to build a slow regex.
    const results = await Crop.find({
      owner: req.user.id,
      name: { $regex: escapeRegex(query), $options: "i" }
    }).sort({ createdAt: -1 });
    res.status(200).json(results);
  } catch (error) {
    console.error("Error searching crops:", error);
    res.status(500).json({ message: "Internal server error searching crops" });
  }
});

// GET single crop by ID
router.get("/:id", async (req, res) => {
  try {
    if (isUnknownId(req.params.id)) {
      return res.status(404).json({ message: "Crop not found" });
    }
    const crop = db.isMock()
      ? ownMockCrops(req).find(c => c.id === req.params.id)
      : await Crop.findOne({ _id: req.params.id, owner: req.user.id });
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
router.post("/", validate(schemas.crop), async (req, res) => {
  try {
    const data = { ...req.body, owner: req.user.id };

    if (db.isMock()) {
      const newCrop = { id: "mock-" + crypto.randomUUID(), ...data };
      db.setMockCrops([newCrop, ...db.getMockCrops()]);
      return res.status(201).json(newCrop);
    }

    const crop = await Crop.create(data);
    res.status(201).json(crop);
  } catch (error) {
    console.error("Error creating crop:", error);
    res.status(500).json({ message: "Internal server error creating crop" });
  }
});

// PUT update an existing crop
router.put("/:id", validate(schemas.cropUpdate), async (req, res) => {
  try {
    if (isUnknownId(req.params.id)) {
      return res.status(404).json({ message: "Crop not found" });
    }

    if (db.isMock()) {
      const crops = db.getMockCrops();
      const cropIndex = crops.findIndex(c => c.id === req.params.id && c.owner === req.user.id);
      if (cropIndex === -1) {
        return res.status(404).json({ message: "Crop not found" });
      }
      crops[cropIndex] = { ...crops[cropIndex], ...req.body };
      db.setMockCrops(crops);
      return res.status(200).json(crops[cropIndex]);
    }

    const crop = await Crop.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      req.body,
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
router.delete("/:id", async (req, res) => {
  try {
    if (isUnknownId(req.params.id)) {
      return res.status(404).json({ message: "Crop not found" });
    }

    if (db.isMock()) {
      const crops = db.getMockCrops();
      const remaining = crops.filter(c => !(c.id === req.params.id && c.owner === req.user.id));
      if (remaining.length === crops.length) {
        return res.status(404).json({ message: "Crop not found" });
      }
      db.setMockCrops(remaining);
      return res.status(204).send();
    }

    const crop = await Crop.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!crop) {
      return res.status(404).json({ message: "Crop not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting crop:", error);
    res.status(500).json({ message: "Internal server error deleting crop" });
  }
});

module.exports = router;
