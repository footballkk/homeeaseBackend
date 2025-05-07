const path = require('path');  // Add this import at the top of the file
const cloudinary = require('cloudinary').v2;
const multerStorageCloudinary = require('multer-storage-cloudinary').CloudinaryStorage;
const multer = require('multer');
const express = require('express');
const router = express.Router();
const { Property } = require('../models/Property');
// Set up multer for image uploads
// Cloudinary Configuration
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
}); // Create multer upload middleware using this storage
// ==================== POST /properties ====================
router.post('/properties', upload.single('image'), async (req, res) => {
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
// ==================== GET /properties (with filtering, sorting, pagination) ====================
router.get('/properties', async (req, res) => {
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
module.exports = router;
