const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');  // Add this import at the top of the file
const router = express.Router();
const { Property } = require('../models/Property');
const multer = require('multer');
// const { route } = require('./paymentRoutes');

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

const storage = new CloudinaryStorage({
cloudinary: cloudinary,
params: {
folder: 'property_images',
allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
transformation: [{ width: 500, height: 500, crop: 'limit' }]
}
});

const upload = multer({ storage: storage, fileFilter: fileFilter });

router.post('/properties', upload.single('image'), async (req, res) => {
console.log('File received:', req.file);
console.log('Form body:', req.body);
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
const imageUrl = req.file ? req.file.path : '';
const existing = await Property.findOne({ title, seller_id });
if (existing) {
return res.status(400).json({ error: 'Property already posted with this title.' });
}
const newProperty = new Property({
seller_id,
location,
title,
// title_am,
size,
description,
// description_am,
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
router.get('/properties', async (req, res) => {
  const properties = await Property.find();
  res.json(properties);
});

module.exports = router;
