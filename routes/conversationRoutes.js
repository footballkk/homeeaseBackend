const express = require('express');
const Conversation = require('../models/Conversation');
const { verifyToken } = require('../middleware/auth'); // adjust path if needed
const router = express.Router();

// ✅ Create or get a conversation between buyer and seller for a property
// ✅ Create or get a conversation between buyer and seller for a property
router.post('/findOrCreate', verifyToken, async (req, res) => {
  console.log('📥 Incoming conversation data:', req.body);
  try {
    const { sellerId, propertyId } = req.body;
    const buyerId = req.user.id;

    console.log('🧾 Parsed IDs - buyerId:', buyerId, 'sellerId:', sellerId, 'propertyId:', propertyId);

    // Prevent self-conversation
    if (buyerId === sellerId) {
      console.warn('⚠️ Buyer is trying to create conversation with self.');
      return res.status(400).json({ message: "Cannot create conversation with self." });
    }

    // Validate presence of required IDs
    if (!sellerId || !buyerId) {
      console.error('❌ Missing sellerId or buyerId');
      return res.status(400).json({ message: 'Missing sellerId or buyerId' });
    }

    // Validate ObjectId format (optional but useful)
    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId(sellerId) || !isValidObjectId(buyerId) || (propertyId && !isValidObjectId(propertyId))) {
      console.error('❌ Invalid MongoDB ObjectId format');
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    // Build query dynamically
    const query = {
      participants: { $all: [buyerId, sellerId] },
    };
    if (propertyId) query.property = propertyId;

    console.log('🔍 Searching with query:', query);

    let conversation = await Conversation.findOne(query);

    if (!conversation) {
      const newConvData = {
        participants: [buyerId, sellerId],
      };
      if (propertyId) newConvData.property = propertyId;

      console.log('🆕 Creating new conversation with:', newConvData);

      conversation = new Conversation(newConvData);
      await conversation.save();
    }

    console.log('✅ Conversation returned:', conversation);
    res.status(200).json(conversation);

  } catch (err) {
    console.error('❌ Error in findOrCreate:', err.stack || err.message || err);
    res.status(500).json({ error: 'Failed to create/find conversation' });
  }
});



// ✅ GET all conversations for the logged-in user
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
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ✅ GET (or create) a conversation between two specific users
router.get('/:userId/:receiverId', verifyToken, async (req, res) => {
  try {
    const { userId, receiverId } = req.params;

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, receiverId] },
    });

    // If conversation doesn't exist, create one
    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, receiverId],
      });
      await conversation.save();
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error('Failed to fetch or create conversation:', err);
    res.status(500).json({ error: 'Server error fetching conversation' });
  }
});



module.exports = router;
