const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// CREATE product
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, discount, barcode } = req.body;
    const product = new Product({ name, price, discount, barcode });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET product by barcode
app.get('/api/products/:barcode', async (req, res) => {
  const { barcode } = req.params;
  try {
    const product = await Product.findOne({ barcode });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE product by barcode
app.delete('/api/products/:barcode', async (req, res) => {
  const { barcode } = req.params;
  try {
    const result = await Product.deleteOne({ barcode });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
