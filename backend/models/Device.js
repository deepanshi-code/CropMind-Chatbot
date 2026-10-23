const mongoose = require("mongoose");

// A sensor device allowed to post telemetry for its owner. Only a SHA-256 hash of the
// key is stored; the key itself is shown to the user once, when the device is created.
const deviceSchema = new mongoose.Schema({
  owner: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 40 },
  keyHash: { type: String, required: true, unique: true },
  keyPrefix: { type: String, required: true },
  lastUsedAt: { type: Date },
}, {
  timestamps: true
});

deviceSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.keyHash;
  }
});

module.exports = mongoose.model("Device", deviceSchema);
