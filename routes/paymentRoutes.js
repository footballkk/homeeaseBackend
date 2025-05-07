const express = require('express');
const router = express.Router();

// Mock version of payment route for development or fallback use
router.post('/create-payment', async (req, res) => {
  const { email, amount, full_name, tx_ref } = req.body;
  // Simulate success response from Chapa
  return res.json({
    message: 'Mock payment initialized successfully',
    data: {
      checkout_url: `https://mock-checkout.com/success/${tx_ref}`,
      tx_ref,
      email,
      amount,
      full_name
    }
  });
});

module.exports = router;
