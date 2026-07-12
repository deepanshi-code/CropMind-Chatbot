const mongoose = require("mongoose");

const cropSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  season: {
    type: String,
    required: true,
    enum: ["Kharif", "Rabi", "Zaid", "Annual"]
  },
  water: {
    type: String,
    required: true,
    enum: ["Low", "Medium", "High"]
  }
}, {
  timestamps: true
});

// Map _id to id in JSON output for frontend compatibility
cropSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

module.exports = mongoose.model("Crop", cropSchema);
