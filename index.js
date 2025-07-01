import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import purchaseHistoryRoutes from "./routes/purchaseHistory.js";
import productRoutes from "./routes/products.js";
import recommendationRoutes from "./routes/recommendations.js";

dotenv.config();

const app = express();
app.use(bodyParser.json());

app.use(cors({
  origin: 'https://dequeue-scanbot.vercel.app', // Your frontend URL
  credentials: true
}));
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use('/api/products', productRoutes);
app.use('/api/purchase-history', purchaseHistoryRoutes);
app.use('/api/recommendations', recommendationRoutes);


app.get('/', (req, res) => {
  res.send('Welcome to the Deque Scanbot Backend API');   
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
