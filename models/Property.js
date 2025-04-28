const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User' // optional: if you have a User model
  },
  type: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  minPrice: {
    type: Number,
    required: true
  },
  maxPrice: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.Property || mongoose.model('Property', propertySchema);
