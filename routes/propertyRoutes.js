const express = require('express');
const router = express.Router();
const multer = require('multer');
const Property = require('../models/Property');
// Set up multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });
// ==================== POST /properties ====================
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
    res.status(201).json({ message: 'Property posted successfully', property });
  } catch (error) {
    res.status(400).json({ error: 'Failed to post property', details: error.message });
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
