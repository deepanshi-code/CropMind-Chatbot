const mongoose = require("mongoose");

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
  // Embedded in every session token; incrementing it (on logout) revokes all existing sessions.
  tokenVersion: {
    type: Number,
    default: 0
  }
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
  }
});

module.exports = mongoose.model("User", userSchema);
