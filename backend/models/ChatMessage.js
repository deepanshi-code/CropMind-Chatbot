const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  owner: { type: String, required: true, index: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  text: { type: String, required: true, maxlength: 8000 },
}, {
  timestamps: true
});

chatMessageSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
