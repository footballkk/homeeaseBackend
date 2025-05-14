const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

router.post('/', async (req, res) => {
  const { senderId, receiverId, content, propertyId } = req.body;

  if (!senderId || !receiverId || !content || !propertyId) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const message = new Message({ senderId, receiverId, content, propertyId });
    await message.save();
    res.status(201).json({ message: 'Message sent', data: message });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// Add GET endpoint later for fetching message threads
module.exports = router;
