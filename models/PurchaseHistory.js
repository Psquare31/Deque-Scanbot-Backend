import mongoose,{Schema} from "mongoose";

const purchaseHistorySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    items: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        barcode: { type: String, required: true },
        image_url: { type: String },
        description: { type: String },
        quantity: {
            type: Number,
            required: true
        },
        rating: { type: Number, min: 1, max: 5 },
        review: { type: String },
        category: { type: String, required: true }
    }],
    amount: {
        type: Number,
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const PurchaseHistory = new mongoose.model('PurchaseHistory', purchaseHistorySchema); 