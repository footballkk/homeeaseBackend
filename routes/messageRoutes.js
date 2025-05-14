const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const authenticate = require('../middleware/authMiddleware');

router.post('/', authenticate, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const message = new Message({
      senderId: req.user.userId,
      receiverId,
      content
    });
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.get('/conversation/:user1/:user2', authenticate, async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const currentUser = req.user.userId;

    if (![user1, user2].includes(currentUser)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

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
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

module.exports = router;