const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.post('/create-payment', async (req, res) => {
  const { email, amount, first_name, last_name, tx_ref } = req.body;

  try {
     const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', {
      email,
      amount,
      currency: 'ETB',
      first_name,
      last_name,
      tx_ref,
      callback_url: 'https://your-frontend-url.com/payment-success'
    }, {
      headers: {
        Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Payment error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

module.exports = router;
