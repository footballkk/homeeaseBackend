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

    // Prevent self-conversation
    if (buyerId === sellerId) {
      return res.status(400).json({ message: "Cannot create conversation with self." });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [buyerId, sellerId] },
      property: propertyId,
    });

    // If not, create one
    if (!conversation) {
      conversation = new Conversation({
        participants: [buyerId, sellerId],
        property: propertyId,
      });
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
