const mongoose = require('mongoose');
const Product = require('./models/Product');
const PurchaseHistory = require('./models//PurchaeHistory');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log("Connected to MongoDB");

  // Generate random products
  // for (let i = 0; i < 3; i++) {
  //   const product = new Product({
  //     name: `Product${i}`,
  //     price: Math.floor(Math.random() * 100),
  //     discount: Math.floor(Math.random() * 20),
  //     barcode: `BARCODE${Math.floor(Math.random() * 100000)}`
  //   });
  //   await product.save();
  //   console.log(`Inserted: ${product.name}`);
  // }
  const randomPurchase = new PurchaseHistory({
    userId: 'user_' + Math.floor(Math.random() * 1000),
    name: 'Random User',
    email: `random${Math.floor(Math.random() * 1000)}@example.com`,
    items: [
      { productId: 'prod123', name: 'Sample Product', quantity: 2, price: 10 }
    ],
    amount: 20,
    orderId: 'order_' + Math.floor(Math.random() * 10000)
  });
  await randomPurchase.save();
  console.log('Random purchase history seeded!');

  mongoose.disconnect();
}).catch(err => {
  console.error("MongoDB connection error:", err);
});