const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  barcode: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);