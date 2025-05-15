const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { verifyToken } = require('../middleware/auth');

// ✅ Send a message in a conversation
router.post('/', verifyToken, async (req, res) => {
  try {
    const { conversationId, receiverId, text } = req.body;
    const senderId = req.user.id;

    const message = new Message({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      text,
    });

    await message.save();

    // Update the last message in the conversation (optional but useful)
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      updatedAt: Date.now(),
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ✅ Get all messages in a conversation
router.get('/:conversationId', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
