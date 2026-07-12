const mongoose = require("mongoose");

const telemetryLogSchema = new mongoose.Schema({
  time: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ["system", "info", "success", "warning"]
  },
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
