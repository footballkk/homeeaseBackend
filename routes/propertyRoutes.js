// routes/propertyRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const Property = require('../models/Property');
// Setup multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });
// POST /properties - Create a new property with image upload
router.post('/properties', upload.single('image'), async (req, res) => {
  try {
    const {
      seller_id,
      type,
      location,
      size,
      minPrice,
      maxPrice,
      description,
    } = req.body;
  const image = req.file ? req.file.path : null;
    const property = new Property({
      seller_id,
      type,
      location,
      size,
      minPrice,
      maxPrice,
      description,
      image
    });
    await property.save();
    res.status(201).json({ message: 'Property created successfully', property });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create property', details: error });
  }
});
// GET /properties - Filter by query parameters, sort, and paginate
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
  // Filter by location
  if (location) filter.location = { $regex: location, $options: 'i' };
  // Filter by price range
  if (minPrice || maxPrice) {
    filter.minPrice = {};
    filter.maxPrice = {};
    if (minPrice) filter.minPrice.$gte = parseInt(minPrice);
    if (maxPrice) filter.maxPrice.$lte = parseInt(maxPrice);
  // Filter by size
  if (size) filter.size = { $regex: size, $options: 'i' };
  // Filter by type
  if (type) filter.type = { $regex: type, $options: 'i' };
  // Sorting options
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
    res.status(500).json({ error: 'Failed to fetch properties', details: error });
  }
});
module.exports = router;
