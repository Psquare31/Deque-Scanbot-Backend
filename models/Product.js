const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: {type: Number, required: true},
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  barcode: { type: String, required: true, unique: true },
  image_url: {type: String, required: false},
  description: {type: String, required: false}
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);