const mongoose = require("mongoose");

const telemetryLogSchema = new mongoose.Schema({
  // Id of the user who owns this record; every query filters on it.
  owner: {
    type: String,
    required: true,
    index: true
  },
  time: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ["system", "info", "success", "warning"]
  },
  // Name of the sensor device that sent the log (absent for logs added by the user).
  source: { type: String, trim: true, maxlength: 40 },
  text: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

telemetryLogSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

module.exports = mongoose.model("TelemetryLog", telemetryLogSchema);
