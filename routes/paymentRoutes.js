const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.post('/api/create-payment', async (req, res) => {
  const { email, amount, full_name, tx_ref } = req.body;

  // Split full name into first and last name
  const [first_name, ...rest] = full_name.trim().split(' ');
  const last_name = rest.join(' ') || 'Unknown';

  try {
    const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', {
      email,
      amount,
      currency: 'ETB',
      first_name,
      last_name,
      tx_ref,
      callback_url: `https://topiaminageba.vercel.app/payment-success/${tx_ref}`
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
