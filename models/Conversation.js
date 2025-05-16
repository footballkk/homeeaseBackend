const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    lastMessage: {
      type: String,
    },
  },
  { timestamps: true }

);

ConversationSchema.index(
  { participants: 1, property: 1 },
  { unique: true }
);
module.exports = mongoose.model('Conversation', ConversationSchema);
