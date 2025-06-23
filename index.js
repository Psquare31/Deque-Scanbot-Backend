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
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use('/api/products', productRoutes);
app.use('/api/purchase-history', purchaseHistoryRoutes);
app.use('/api/recommendations', recommendationRoutes);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
