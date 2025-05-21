const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { verifyToken } = require('../middleware/auth'); // adjust path if needed

// ✅ Create or get a conversation between buyer and seller for a property
// ✅ Create or get a conversation between buyer and seller for a property
router.post('/findOrCreate', verifyToken, async (req, res) => {
  console.log('📥 Incoming conversation data:', req.body);

  try {
    const { sellerId, propertyId } = req.body;
    const buyerId = req.user?.id;

    // ✅ Defensive checks
    if (!buyerId || !sellerId) {
      return res.status(400).json({ error: 'Missing buyer or seller ID' });
    }

    if (buyerId === sellerId) {
      return res.status(400).json({ error: "Cannot create conversation with self." });
    }

    if (propertyId && !mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ error: "Invalid property ID." });
    }

    let query = {
      participants: { $all: [buyerId, sellerId] },
    };

    if (propertyId) {
      query.property = propertyId;
    }

    let conversation = await Conversation.findOne(query);

    if (!conversation) {
      const newConvData = {
        participants: [buyerId, sellerId],
      };

      if (propertyId) {
        newConvData.property = propertyId;
      }

      conversation = new Conversation(newConvData);
      await conversation.save();

      // ✅ Safely populate
      if (propertyId) {
        await conversation.populate('property');
      }
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error('❌ Error in findOrCreate:', err.message, err.stack);
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
