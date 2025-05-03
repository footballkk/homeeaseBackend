// Import dependencies
const cloudinary = require('cloudinary').v2;
const multerStorageCloudinary = require('multer-storage-cloudinary').CloudinaryStorage;
// Configure Cloudinary with your environment variables
const multer = require('multer');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// Initialize Express app
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// node server
// Define storage for images (you can customize the folder and naming conventions)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new multerStorageCloudinary({
  cloudinary: cloudinary,
  params: {
    folder: 'property_images', // Folder in Cloudinary where images will be stored
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'], // Allowed file formats
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional image resizing
  }
});
const upload = multer({ storage: storage }).single('image'); 
// Filter to ensure only image files are uploaded
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
// Create the upload function using multer
// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
// }).single('image');  // 'image' refers to the name attribute of the <input type="file" /> field
// Connect to MongoDB
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
// Property Schema
const PropertySchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, required: true }, // apartment, house, villa
  location: { type: String, required: true },
  size: { type: String, required: true },
  minPrice: { type: Number, required: true },
  maxPrice: { type: Number, required: true },
  description: { type: String, required: true },
  image: { type: String }, // single image filename or path
  created_at: { type: Date, default: Date.now }
});
app.get("/", (req, res) => {
  res.send("Server is up and running!");
});
const Property = mongoose.model('Property', PropertySchema);
// Register User
app.post('/register', async (req, res) => {
  try {
      const { full_name, email, password, role} = req.body;
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
// Add Property (Seller only)
// Add Property (Seller only) with image upload
// const upload = multer({ storage: storage, fileFilter: fileFilter}); // ✅ this line creates the actual upload instance
app.post('/properties', upload, async (req, res) => {
  console.log('File received:', req.file);
  console.log('Form body:', req.body);
  try {
    const {
      seller_id,
      title,
      location,
      size,
      description,
      type,
      minPrice,
      maxPrice
    } = req.body;
    const imageUrl = req.file ? req.file.path : ''; // Cloudinary URL for the uploaded image
    const newProperty = new Property({
      seller_id,
      title,
      location,
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
// POST /properties - add new property
// router.post('/properties', async (req, res) => {
//   try {
//     const { location, price, size, description } = req.body;
//     const newProperty = new Property({
//       location,
//       price,
//       size,
//       description
//     });
//     await newProperty.save();
//     res.status(201).json({ message: 'Property added successfully', property: newProperty });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Failed to add property' });
//   }
// });
// Get All Properties
app.get('/properties', async (req, res) => {
  try {
      const properties = await Property.find();
      res.json(properties);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});
// Get All Users (Admin only)
app.get('/users', async (req, res) => {
  try {
      const users = await User.find(); // Fetch all users
      res.json(users); // Return the users as a response
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
