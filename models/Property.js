const mongoose = require('mongoose');

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
module.exports = mongoose.model('Property', propertySchema);
