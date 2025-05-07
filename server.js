const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Property = require('./models/Property');
const propertyRoutes = require('./routes/propertyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// ✅ CORS setup before any routes or middleware
app.use(cors({
  origin: 'https://topiaminageba.vercel.app',  // Allow the frontend domain
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ Use express.json() and express.urlencoded() before route handling
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Apply routes
app.use('/api',  Property);
app.use('/api', paymentRoutes);  // Payment routes
app.use('/api', propertyRoutes);  // Property routes

// ✅ Connect to MongoDB after setting up middleware
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

// User Schema
const UserSchema = new mongoose.Schema({
  full_name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Register User
app.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ full_name, email, password: hashedPassword, role });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
    console.log(req.body);
  }
});

// Login User
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, full_name: user.full_name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();  // Fetch all users
    res.json(users);  // Return the users as a response
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user by email
app.delete('/users/:email', async (req, res) => {
  try {
    const result = await User.deleteOne({ email: req.params.email });
    res.json({ message: 'User deleted successfully', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all users
app.delete('/users', async (req, res) => {
  try {
    const result = await User.deleteMany({});
    res.json({ message: 'All users deleted successfully', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all properties
app.delete('/properties', async (req, res) => {
  try {
    const result = await Property.deleteMany({});
    res.json({ message: 'All properties deleted successfully', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
