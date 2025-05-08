// ========================
// 🔹 Imports & Config
// ========================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Load environment variables
dotenv.config();
const axios = require('axios');

async function translateText(text, targetLang = 'am') {
  try {
    const response = await axios.post('https://libretranslate.de/translate', {
      q: text,
      source: 'en',
      target: targetLang,
      format: 'text'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data.translatedText;
  } catch (error) {
    console.error('Translation error:', error.message);
    return text; // fallback to original text if translation fails
  }
}
// ========================
// 🔹 App Initialization
// ========================
const app = express();

// ========================
// 🔹 Middleware
// ========================
app.use(cors({
  origin: 'https://topiaminageba.vercel.app',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
const PropertySchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  title_am: { type: String },       // Amharic translation
  title_om: { type: String },       // Afan Oromo translation
  location: { type: String, required: true },
  size: { type: String, required: true },
  minPrice: { type: Number, required: true },
  maxPrice: { type: Number, required: true },
  description: { type: String, required: true },
  description_am: { type: String }, // Amharic translation
  description_om: { type: String }, // Afan Oromo translation
  image: { type: String },
  created_at: { type: Date, default: Date.now }
});
const Property = mongoose.model('Property', PropertySchema);
const UserSchema = new mongoose.Schema({
  full_name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

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
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, full_name: user.full_name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    // 🔁 Automatically translate title and description
    const title_am = await translateText(title, 'am');
    const description_am = await translateText(description, 'am');
    const title_om = await translateText(title, 'om');
    const description_om = await translateText(description, 'om');
    const newProperty = new Property({
      seller_id,
      location,
      title,
      title_am,
      title_om,
      size,
      description,
      description_am,
      description_om,
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
  const {
    location,
    minPrice,
    maxPrice,
    size,
    type,
    sortBy,
    order,
    page = 1,
    limit = 10
  } = req.query;

  let filter = {};
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (minPrice || maxPrice) {
    if (minPrice) filter.minPrice = { $gte: parseInt(minPrice) };
    if (maxPrice) filter.maxPrice = { $lte: parseInt(maxPrice) };
  }
  if (size) filter.size = { $regex: size, $options: 'i' };
  if (type) filter.type = { $regex: type, $options: 'i' };

  const sortOptions = {};
  if (sortBy) sortOptions[sortBy] = order === 'desc' ? -1 : 1;
  const skip = (page - 1) * limit;

  try {
    const properties = await Property.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch properties', details: error.message });
  }
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
