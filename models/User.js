const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
full_name: String,
email: { type: String, unique: true },
password: String,
role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);