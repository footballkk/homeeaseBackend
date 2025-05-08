const cloudinary = require('cloudinary').v2;
const multerStorageCloudinary = require('multer-storage-cloudinary').CloudinaryStorage;
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// const propertyRoutes = require('./routes/propertyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const app = express();
// ✅ CORS setup before any routes or middleware
app.use(cors({
  origin: 'https://topiaminageba.vercel.app',  // Allow the frontend domain
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
const PropertySchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, required: true }, // apartment, house, villa
  title: { type: String, required: true },
  location: { type: String, required: true },
  size: { type: String, required: true },
  minPrice: { type: Number, required: true },
  maxPrice: { type: Number, required: true },
  description: { type: String, required: true },
  image: { type: String }, // single image filename or path
  created_at: { type: Date, default: Date.now }
});
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
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
// Multer Storage Setup for Cloudinary
const storage = new multerStorageCloudinary({
  cloudinary: cloudinary,
  params: {
    folder: 'property_images', // Folder in Cloudinary where images will be stored
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'], // Allowed file formats
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional image resizing
  }
});
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
});
// ✅ Use express.json() and express.urlencoded() before route handling
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// ✅ Serve static files (uploads)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ✅ Apply routes
app.use('/api', paymentRoutes);  // Payment routes
// app.use('/api', propertyRoutes);  // Property routes
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
app.post('/properties', upload.single('image'), async (req, res) => {
  console.log('File received:', req.file);  // Ensure this logs the file information
  console.log('Form body:', req.body);  // Ensure this logs the form fields
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
     // Cloudinary URL is automatically set in req.file.path, ensure it's correct
     const imageUrl = req.file ? req.file.path : '';  // This should be the Cloudinary URL now
     const newProperty = new Property({
        seller_id,
        location,
        title,
        size,
        description,
        type,
        minPrice,
        maxPrice,
        image: imageUrl,  // Save Cloudinary URL here
        created_at: new Date()
     });
     const saved = await newProperty.save();
     console.log('Saved property:', saved);  // Ensure this logs the property with Cloudinary URL
     res.status(201).json({ message: 'Property added successfully', property: saved });
  } catch (err) {
     console.error('Error saving property:', err);  // Logs any error during save
     res.status(400).json({ error: 'Failed to save property', details: err.message });
  }
});
//get the posted property also back!
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
// Delete user by ema
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
