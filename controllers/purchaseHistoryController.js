import mongoose from "mongoose";
import { PurchaseHistory } from "../models/PurchaseHistory.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPurchaseHistory = asyncHandler(async (req, res) => {
    const { 
        userId, 
        name,
        email,
        items, 
        amount,
        orderId
    } = req.body;

    if (!userId || !name || !email || !items || !amount || !orderId) {
        throw ApiError.create(400, "All fields are required: userId, name, email, items, amount, orderId");
    }

    if (!Array.isArray(items) || items.length === 0) {
        throw ApiError.create(400, "Items must be a non-empty array");
    }

    // Validate items array
    for (const item of items) {
        if (!item.productId || !item.name || !item.price || !item.barcode || !item.quantity || !item.category) {
            throw ApiError.create(400, "Each item must have productId, name, price, barcode, quantity, and category");
        }
        if (!mongoose.isValidObjectId(item.productId)) {
            throw ApiError.create(400, "Invalid product ID format");
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
            throw ApiError.create(400, "Quantity must be a positive number");
        }
        if (typeof item.price !== 'number' || item.price < 0) {
            throw ApiError.create(400, "Price must be a non-negative number");
        }
    }

    try {
        const purchaseHistory = await PurchaseHistory.create({
            userId,
            name,
            email,
            items,
            amount,
            orderId,
            createdAt: new Date()
        });

        // Update product quantities and total purchases
        for (const item of items) {
            await Product.findByIdAndUpdate(
                item.productId,
                {
                    $inc: {
                        quantity: -item.quantity,
                        totalPurchases: item.quantity
                    }
                }
            );
        }

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    purchaseHistory,
                    "Purchase history created successfully"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error creating purchase history: " + error.message);
    }
});

const getPurchaseHistoryByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { 
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    if (!userId) {
        throw ApiError.create(400, "User ID is required");
    }

    try {
        // Build filter object
        const filter = { userId };
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const purchaseHistory = await PurchaseHistory.find(filter)
            .sort(sort)
            .populate('items.productId', 'name barcode category');

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        purchaseHistory,
                        count: purchaseHistory.length,
                        filters: {
                            startDate,
                            endDate
                        }
                    },
                    "Purchase history fetched successfully"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error fetching purchase history: " + error.message);
    }
});

const getPurchaseHistoryByOrderId = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!orderId) {
        throw ApiError.create(400, "Order ID is required");
    }

    try {
        const purchaseHistory = await PurchaseHistory.findOne({ orderId });

        if (!purchaseHistory) {
            throw ApiError.create(404, "Purchase history not found");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    purchaseHistory,
                    "Purchase history retrieved successfully"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error retrieving purchase history: " + error.message);
    }
});

const deletePurchaseHistory = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!orderId) {
        throw ApiError.create(400, "Order ID is required");
    }

    try {
        const result = await PurchaseHistory.deleteOne({ orderId });

        if (result.deletedCount === 0) {
            throw ApiError.create(404, "Purchase history not found");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    null,
                    "Purchase history deleted successfully"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error deleting purchase history: " + error.message);
    }
});

const updatePurchaseHistoryItems = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { items, additionalAmount } = req.body;

    if (!orderId) {
        throw ApiError.create(400, "Order ID is required");
    }

    if (!items || !Array.isArray(items)) {
        throw ApiError.create(400, "Items must be an array");
    }

    if (!additionalAmount || typeof additionalAmount !== 'number' || additionalAmount <= 0) {
        throw ApiError.create(400, "Valid additional amount is required");
    }

    try {
        const purchaseHistory = await PurchaseHistory.findOne({ orderId });
        if (!purchaseHistory) {
            throw ApiError.create(404, "Purchase history not found");
        }

        // Validate new items
        for (const item of items) {
            if (
                !item.productId || 
                !item.name || 
                !item.price || 
                !item.barcode || 
                !item.quantity || 
                !item.category
            ) {
                throw ApiError.create(400, "Each item must have productId, name, price, barcode, quantity, and category");
            }
            if (!mongoose.isValidObjectId(item.productId)) {
                throw ApiError.create(400, "Invalid product ID format");
            }
        }

        // Calculate quantity differences for new items only
        const newItems = new Map(items.map(item => [item.productId.toString(), item.quantity]));

        // Update product quantities for new items
        for (const [productId, quantity] of newItems) {
            await Product.findByIdAndUpdate(
                productId,
                {
                    $inc: {
                        quantity: -quantity,
                        totalPurchases: quantity
                    }
                }
            );
        }

        // Add to existing amount and append new items
        const newTotalAmount = purchaseHistory.amount + additionalAmount;
        const updatedItems = [...purchaseHistory.items, ...items];

        // Update purchase history
        const updatedHistory = await PurchaseHistory.findOneAndUpdate(
            { orderId },
            {
                $push: { items: { $each: items } }, // Append new items instead of overwriting
                amount: newTotalAmount,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('items.productId', 'name barcode category');

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedHistory,
                    "Purchase history updated successfully with new items"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error updating purchase history: " + error.message);
    }
});
const addRatingToPurchase = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { ratings } = req.body;

    if (!orderId) {
        throw ApiError.create(400, "Order ID is required");
    }

    if (!ratings || !Array.isArray(ratings)) {
        throw ApiError.create(400, "Ratings must be an array");
    }

    try {
        const purchaseHistory = await PurchaseHistory.findOne({ orderId });
        if (!purchaseHistory) {
            throw ApiError.create(404, "Purchase history not found");
        }

        // Validate ratings
        for (const rating of ratings) {
            if (!rating.productId || typeof rating.rating !== 'number' || rating.rating < 1 || rating.rating > 5) {
                throw ApiError.create(400, "Each rating must have a valid productId and rating between 1 and 5");
            }
        }

        // Update product ratings and purchase history items
        const updatedItems = purchaseHistory.items.map(item => {
            const rating = ratings.find(r => r.productId.toString() === item.productId.toString());
            if (rating) {
                return { ...item.toObject(), rating: rating.rating };
            }
            return item;
        });

        // Update product ratings
        for (const rating of ratings) {
            const product = await Product.findById(rating.productId);
            if (!product) {
                throw ApiError.create(404, `Product with ID ${rating.productId} not found`);
            }

            // Calculate new average rating
            const newTotalPurchases = product.totalPurchases;
            const newRating = ((product.rating * product.totalPurchases) + rating.rating) / (newTotalPurchases + 1);

            await Product.findByIdAndUpdate(
                rating.productId,
                {
                    rating: Number(newRating.toFixed(1)),
                    totalPurchases: newTotalPurchases + 1
                }
            );
        }

        // Update purchase history with ratings
        const updatedHistory = await PurchaseHistory.findOneAndUpdate(
            { orderId },
            {
                items: updatedItems,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('items.productId', 'name barcode category');

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedHistory,
                    "Ratings added successfully"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error adding ratings: " + error.message);
    }
});

export {
    createPurchaseHistory,
    getPurchaseHistoryByUserId,
    getPurchaseHistoryByOrderId,
    deletePurchaseHistory,
    updatePurchaseHistoryItems,
    addRatingToPurchase
}; 