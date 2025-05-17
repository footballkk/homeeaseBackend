const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { verifyToken } = require('../middleware/auth'); // adjust path if needed

// ✅ Create or get a conversation between buyer and seller for a property
router.post('/findOrCreate', verifyToken, async (req, res) => {
  console.log('📥 Incoming conversation data:', req.body);
  try {
    const { sellerId, propertyId } = req.body;
    const buyerId = req.user.id;

    if (buyerId === sellerId) {
      return res.status(400).json({ message: "Cannot create conversation with self." });
    }

    let query = {
      participants: { $all: [buyerId, sellerId] },
    };

    // Add property to query only if propertyId is provided
    if (propertyId) {
      query.property = propertyId;
    } else {
      // Optional: You may want to ensure that property field does not exist or is null for inbox conversations
      query.property = { $exists: false };
    }

    let conversation = await Conversation.findOne(query);

    if (!conversation) {
      // Create conversation object conditionally adding propertyId
      const newConvData = {
        participants: [buyerId, sellerId],
      };

      if (propertyId) {
        newConvData.property = propertyId;
      }

      conversation = new Conversation(newConvData);
      await conversation.save();
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error('Error in findOrCreate:', err);
    res.status(500).json({ error: 'Failed to create/find conversation' });
  }
});


// ✅ Get all conversations for the logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ updatedAt: -1 })
      .populate('property')
      .populate('participants', 'name email');

    res.status(200).json(conversations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

module.exports = router;
