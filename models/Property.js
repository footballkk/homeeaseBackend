const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
seller_id: { type: mongoose.Schema.Types.ObjectId, required: true },
type: { type: String, required: true },
title: { type: String, required: true },
// title_am: { type: String },       // Amharic translation
location: { type: String, required: true },
size: { type: String, required: true },
minPrice: { type: Number, required: true },
maxPrice: { type: Number, required: true },
description: { type: String, required: true },
// description_am: { type: String }, // Amharic translation
image: { type: String },
created_at: { type: Date, default: Date.now }
});
// const Property = mongoose.model('Property', PropertySchema);
module.exports = mongoose.model('Property', PropertySchema);
