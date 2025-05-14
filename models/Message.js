const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('Message', messageSchema);
