const { ownedCollection } = require("./store");
const Diagnosis = require("../models/Diagnosis");
const ChatMessage = require("../models/ChatMessage");
const Device = require("../models/Device");

module.exports = {
  diagnoses: ownedCollection("diagnoses", Diagnosis),
  chatMessages: ownedCollection("chatMessages", ChatMessage),
  devices: ownedCollection("devices", Device),
};
