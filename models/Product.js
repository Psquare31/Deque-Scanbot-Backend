import mongoose,{Schema} from "mongoose"

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: {type: Number, required: true},
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  barcode: { type: String, required: true, unique: true },
  image_url: {type: String, required: false},
  description: {type: String, required: false},
  // New fields for recommendations
  category: { type: String, required: true },
  tags: [{ type: String }],
  rating: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  similarProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });

export const Product = new mongoose.model('Product', productSchema);
