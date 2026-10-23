const mongoose = require("mongoose");

// A saved crop diagnosis. The photo itself is not stored, only whether one was used.
const diagnosisSchema = new mongoose.Schema({
  owner: { type: String, required: true, index: true },
  cropName: { type: String, required: true, trim: true },
  symptoms: { type: String, default: "" },
  hadPhoto: { type: Boolean, default: false },
  language: { type: String, enum: ["en", "hi"], default: "en" },
  result: {
    diagnosis: String,
    confidence: Number,
    severity: String,
    treatment: [String],
    prevention: [String],
    fertilizerIrrigationGuidance: String,
  },
}, {
  timestamps: true
});

diagnosisSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

module.exports = mongoose.model("Diagnosis", diagnosisSchema);
