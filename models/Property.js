const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  type: { type: String, required: true },
  location: { type: String, required: true },
  size: { type: String, required: true },
  minPrice: { type: Number, required: true },
  maxPrice: { type: Number, required: true },
  description: { type: String },
  image: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Property', propertySchema);
