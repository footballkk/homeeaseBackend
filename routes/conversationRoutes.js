const express = require('express');
const mongoose = require('mongoose');
const Conversation = require('../models/conversation'); // Adjust path as needed
const router = express.Router();

// ✅ Create or get a conversation between buyer and seller for a property
// ✅ Create or get a conversation between buyer and seller for a property
router.post('/findOrCreate', verifyToken, async (req, res) => {
  try {
    const { sellerId, propertyId } = req.body;
    const buyerId = req.user.id;

    // ✅ Validate IDs
    if (!mongoose.Types.ObjectId.isValid(sellerId) || !mongoose.Types.ObjectId.isValid(buyerId)) {
      return res.status(400).json({ error: 'Invalid seller or buyer ID' });
    }

    if (propertyId && !mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    // ✅ Convert to ObjectId
    const buyerObjId = new mongoose.Types.ObjectId(buyerId);
    const sellerObjId = new mongoose.Types.ObjectId(sellerId);
    const propertyObjId = propertyId ? new mongoose.Types.ObjectId(propertyId) : null;

    // ✅ Ensure participants are in consistent order (optional but clean)
    const participants = [buyerObjId, sellerObjId].sort();

    // ✅ Check for existing conversation
    let conversation = await Conversation.findOne({
      participants: participants,
      property: propertyObjId,
    });

    if (!conversation) {
      // ✅ Create new conversation
      conversation = new Conversation({
        participants,
        property: propertyObjId,
        lastMessage: '',
      });

      await conversation.save();
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error('❌ Error in /findOrCreate:', err);
    res.status(500).json({ error: 'Internal server error' });
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
