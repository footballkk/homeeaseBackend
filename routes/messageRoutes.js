const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const authenticate = require('../middleware/authMiddleware'); // 👈 import

// POST /api/messages - send a message (protected)
router.post('/', authenticate, async (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user.userId;

  try {
    const message = new Message({ senderId, receiverId, content });
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/:userId - user’s messages (protected)
router.get('/:userId', authenticate, async (req, res) => {
  const userId = req.params.userId;

  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  try {
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ timestamp: -1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// GET /api/messages/conversation/:user1/:user2 (protected)
// ✅ Get paginated conversation between two users with auth and access control
router.get('/conversation/:user1/:user2', authenticate, async (req, res) => {
  const { user1, user2 } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // ✅ Security check: only allow users involved in the conversation
  if (![user1, user2].includes(req.user.userId)) {
    return res.status(403).json({ error: 'Unauthorized access to conversation' });
  }

  try {
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get paginated messages' });
  }
});

