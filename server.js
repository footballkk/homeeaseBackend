// ========================
// 🔹 Imports & Config
// ========================

const dotenv = require('dotenv');
dotenv.config();
const crypto = require('crypto'); // ✅ this uses the built-in module
const nodemailer = require('nodemailer');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('./models/User'); 
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const contactRoutes = require('./routes/contactRoutes');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Load environment variables
const axios = require('axios');
const app = express();
const allowedOrigins = ['https://topiaminageba.vercel.app'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true, // If you're using cookies or HTTP auth
}));
async function translateText(text, targetLang = 'am') {
// Simulated/mock translation (Option 3)
return `[AM] ${text}`; // Just prefixes [AM] for demonstration
}
// ========================
// 🔹 App Initialization
// ========================

// ========================
// 🔹 Middleware
// ========================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api', contactRoutes);

// app.use('/api', propertyRoutes);
// ========================
// 🔹 Cloudinary Config
// ========================
cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ========================
// 🔹 Multer + Cloudinary Storage
// ========================
const fileFilter = (req, file, cb) => {
const filetypes = /jpeg|jpg|png|gif|webp|bmp|jfif/;
const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
const mimetype = filetypes.test(file.mimetype);
if (extname && mimetype) {
return cb(null, true);
} else {
cb('Error: Only image files are allowed!');
}
};

const storage = new CloudinaryStorage({
cloudinary: cloudinary,
params: {
folder: 'property_images',
allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
transformation: [{ width: 500, height: 500, crop: 'limit' }]
}
});

const upload = multer({ storage: storage, fileFilter: fileFilter });

// ========================
// 🔹 MongoDB Models
// ========================
const Property = require('./models/Property');
// ========================
// 🔹 Routes
// ========================
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api', paymentRoutes);

// ========================
// 🔹 Auth Routes
// ========================
app.post('/register', async (req, res) => {
try {
const { full_name, email, password, role } = req.body;
const existingUser = await User.findOne({ email });
if (existingUser) {
return res.status(400).json({ error: 'Email already registered' });
}
const hashedPassword = await bcrypt.hash(password, 10);
const newUser = new User({ full_name, email, password: hashedPassword, role });
await newUser.save();
res.status(201).json({ message: 'User registered successfully' });
} catch (err) {
res.status(400).json({ error: err.message });
console.log(req.body);
}
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      role: user.role,
      user: {
        _id: user._id,
        name: user.full_name || user.name,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// 🔹 Forgot Password Route
// ========================
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not found' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: parseInt(process.env.EMAIL_PORT, 10) === 465, // adjust secure based on port
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `https://topiaminageba.vercel.app/reset-password/${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    res.json({ message: 'Reset email sent successfully' });
  } catch (err) {
    console.error('Error in /forgot-password:', err); // log the actual error
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ========================
// 🔹 Reset Password Route
// ========================
app.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Token invalid or expired' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Error in /reset-password:', err);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// ========================
// 🔹 User Routes
// ========================
app.get('/users', async (req, res) => {
try {
const users = await User.find();
res.json(users);
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.delete('/users/:email', async (req, res) => {
try {
const result = await User.deleteOne({ email: req.params.email });
res.json({ message: 'User deleted successfully', result });
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.delete('/users', async (req, res) => {
try {
const result = await User.deleteMany({});
res.json({ message: 'All users deleted successfully', result });
} catch (err) {
res.status(500).json({ error: err.message });
}
});
//ping roots
app.get('/ping', (req, res) => {
  res.send('pong');
});
// ========================
// 🔹 Property Routes
// ========================
app.post('/properties', upload.single('image'), async (req, res) => {
console.log('File received:', req.file);
console.log('Form body:', req.body);
try {
const {
seller_id,
location,
title,
size,
description,
type,
minPrice,
maxPrice
} = req.body;
const imageUrl = req.file ? req.file.path : '';
const existing = await Property.findOne({ title, seller_id });
if (existing) {
return res.status(400).json({ error: 'Property already posted with this title.' });
}
const newProperty = new Property({
seller_id,
location,
title,
size,
description,
type,
minPrice,
maxPrice,
image: imageUrl,
created_at: new Date()
});
const saved = await newProperty.save();
console.log('Saved property:', saved);
res.status(201).json({ message: 'Property added successfully', property: saved });
} catch (err) {
console.error('Error saving property:', err);
res.status(400).json({ error: 'Failed to save property', details: err.message });
}
});
app.get('/properties', async (req, res) => {
  const properties = await Property.find();
  res.json(properties);
});
app.delete('/properties', async (req, res) => {
try {
const result = await Property.deleteMany({});
res.json({ message: 'All properties deleted successfully', result });
} catch (err) {
res.status(500).json({ error: err.message });
}
});

// ========================
// 🔹 Connect to MongoDB & Start Server
// ========================
mongoose.connect(process.env.MONGO_URI, {
useNewUrlParser: true,
useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));