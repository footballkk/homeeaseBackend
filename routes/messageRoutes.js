const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User'); // required for name lookup
const Property = require('../models/Property'); // required for property info

// ✅ SEND A MESSAGE
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


// ✅ GET ALL CONVERSATIONS FOR A USER
router.get('/conversations/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ timestamp: -1 });

    const grouped = {};

    for (const msg of messages) {
      const otherUserId = msg.senderId.toString() === userId ? msg.receiverId : msg.senderId;
      const key = `${otherUserId}_${msg.propertyId}`;

      if (!grouped[key]) {
        const user = await User.findById(otherUserId).select('full_name');
        const property = await Property.findById(msg.propertyId).select('location price size');

        grouped[key] = {
          participant: { _id: user._id, full_name: user.full_name },
          property: { _id: property._id, location: property.location, price: property.price, size: property.size },
          lastMessage: msg
        };
      }
    }

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch conversations', error: err.message });
  }
});


// ✅ GET FULL THREAD BETWEEN TWO USERS FOR A PROPERTY
router.get('/thread/:user1/:user2/:propertyId', async (req, res) => {
  const { user1, user2, propertyId } = req.params;

  try {
    const thread = await Message.find({
      propertyId,
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
    }).sort({ timestamp: 1 }); // oldest first

    res.json(thread);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch thread', error: err.message });
  }
});

module.exports = router;
