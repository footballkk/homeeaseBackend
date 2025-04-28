const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post('/send', async (req, res) => {
  const { name, email, message } = req.body;

  // Create a transporter using your email credentials (for example Gmail)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'seid21225@gmail.com', // replace with your email
      pass: 'your_app_password' // use app password, NOT your main password
    }
  });

  const mailOptions = {
    from: email,
    to: 'your.email@gmail.com', // where the message will be sent
    subject: `Contact Form Message from ${name}`,
    text: message
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

module.exports = router;
