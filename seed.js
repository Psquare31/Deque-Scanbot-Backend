const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log("Connected to MongoDB");

  // Generate random products
  for (let i = 0; i < 5; i++) {
    const product = new Product({
      name: `Product${i}`,
      price: Math.floor(Math.random() * 100),
      discount: Math.floor(Math.random() * 20),
      barcode: `BARCODE${Math.floor(Math.random() * 100000)}`
    });
    await product.save();
    console.log(`Inserted: ${product.name}`);
  }

  mongoose.disconnect();
}).catch(err => {
  console.error("MongoDB connection error:", err);
});