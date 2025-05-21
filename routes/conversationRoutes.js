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
    const buyerId = req.user.id;

    
    // ✅ Ensure all IDs are valid ObjectId instances
    const buyerObjId = new mongoose.Types.ObjectId(buyerId);
    const sellerObjId = new mongoose.Types.ObjectId(sellerId);
    const propertyObjId = propertyId ? new mongoose.Types.ObjectId(propertyId) : null;

    // Prevent self-conversation
    if (buyerId === sellerObjId) {
      return res.status(400).json({ message: "Cannot create conversation with self." });
    }

    // Build query dynamically
    let query = {
      participants: { $all: [buyerObjId, sellerObjId] },
    };

    if (propertyId) {
      query.property = propertyObjId;
    }

    // Find existing conversation
    let conversation = await Conversation.findOne(query);

    // If not found, create a new one
    if (!conversation) {
      const newConvData = {
        participants: [buyerObjId, sellerObjIds],
      };

      if (propertyId) {
        newConvData.property = propertyId;
      }

      conversation = new Conversation(newConvData);
      await conversation.save();
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error('❌ Error in findOrCreate:', err);
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
