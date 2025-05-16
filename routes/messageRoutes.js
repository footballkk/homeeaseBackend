const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { verifyToken } = require('../middleware/auth');

// ✅ Send a message in a conversation
router.post('/', verifyToken, async (req, res) => {
  const { conversationId, receiverId, text } = req.body;
  const senderId = req.user.id;

  // Validate required fields
  if (!conversationId || !receiverId || !text) {
    return res.status(400).json({ message: 'Missing required fields: conversationId, receiverId, and text are required.' });
  }

  try {
    // Optional: Validate conversation exists
    const conversationExists = await Conversation.findById(conversationId);
    if (!conversationExists) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const message = new Message({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      text,
    });

    await message.save();

    // Update the last message and updatedAt in the conversation (optional but useful)
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      updatedAt: Date.now(),
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Get all messages in a conversation
router.get('/:conversationId', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ✅ Get all messages between two users (for ChatPage)
router.get('/:senderId/:receiverId/direct', verifyToken, async (req, res) => {
  const { senderId, receiverId } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    console.error('Failed to fetch messages between users:', err);
    res.status(500).json({ error: 'Failed to fetch messages between users' });
  }
});

module.exports = router;
