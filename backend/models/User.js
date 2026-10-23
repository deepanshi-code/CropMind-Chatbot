const mongoose = require("mongoose");

const RATINGS = ["Low", "Medium", "High"];

// Values and ratings exactly as printed on the user's Soil Health Card / lab report.
// The app does not compute N/P/K ratings itself: Indian labs report P as P or P2O5 and
// K as K or K2O with different cut-offs, so the lab's own rating is the reliable one.
const soilTestSchema = new mongoose.Schema({
  nitrogen: { type: Number, min: 0, max: 5000 },
  phosphorus: { type: Number, min: 0, max: 5000 },
  potassium: { type: Number, min: 0, max: 5000 },
  nitrogenRating: { type: String, enum: RATINGS },
  phosphorusRating: { type: String, enum: RATINGS },
  potassiumRating: { type: String, enum: RATINGS },
  ph: { type: Number, min: 0, max: 14 },
  organicCarbon: { type: Number, min: 0, max: 100 },
  testedOn: { type: Date },
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  // "password" accounts know their password; "google" accounts were created through OAuth
  // and have a random, unknown password until they set one.
  authProvider: {
    type: String,
    enum: ["password", "google"],
    default: "password"
  },
  // Embedded in every session token; incrementing it (on logout) revokes all existing sessions.
  tokenVersion: {
    type: Number,
    default: 0
  },
  name: { type: String, trim: true, maxlength: 60 },
  language: { type: String, enum: ["en", "hi"], default: "en" },
  // Farm location chosen by the user (district search or rounded browser location).
  location: {
    name: { type: String, trim: true, maxlength: 120 },
    lat: { type: Number, min: -90, max: 90 },
    lon: { type: Number, min: -180, max: 180 },
  },
  soilTest: soilTestSchema,
  privacyAcceptedAt: { type: Date },
}, {
  timestamps: true
});

userSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password; // Do not return password hash
    delete ret.tokenVersion;
  }
});

module.exports = mongoose.model("User", userSchema);
module.exports.RATINGS = RATINGS;
