import mongoose from "mongoose";
import { PurchaseHistory } from "../models/PurchaseHistory.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPurchaseHistory = asyncHandler(async (req, res) => {
    const { userId, name, email, items, amount, orderId } = req.body;

    if (!userId || !name || !email || !items || !amount || !orderId) {
        throw ApiError.create(400, "All fields are required: userId, name, email, items, amount, orderId");
    }

    if (!Array.isArray(items) || items.length === 0) {
        throw ApiError.create(400, "Items must be a non-empty array");
    }

    for (const item of items) {
        if (!item.productId || !item.name || !item.price || !item.barcode || !item.quantity) {
            throw ApiError.create(400, "Each item must have productId, name, price, barcode, and quantity");
        }
        if (!mongoose.isValidObjectId(item.productId)) {
            throw ApiError.create(400, "Invalid productId format");
        }
    }

    try {
        const purchaseHistory = await PurchaseHistory.create({
            userId,
            name,
            email,
            items,
            amount,
            orderId
        });

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

    if (!userId) {
        throw ApiError.create(400, "User ID is required");
    }

    try {
        const purchaseHistory = await PurchaseHistory.find({ userId })
            .sort({ createdAt: -1 });

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

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw ApiError.create(400, "Items must be a non-empty array");
    }

    if (!additionalAmount || typeof additionalAmount !== 'number' || additionalAmount <= 0) {
        throw ApiError.create(400, "Valid additional amount is required");
    }

    for (const item of items) {
        if (!item.productId || !item.name || !item.price || !item.barcode || !item.quantity) {
            throw ApiError.create(400, "Each item must have productId, name, price, barcode, and quantity");
        }
        if (!mongoose.isValidObjectId(item.productId)) {
            throw ApiError.create(400, "Invalid productId format");
        }
    }

    try {
        const purchaseHistory = await PurchaseHistory.findOne({ orderId });

        if (!purchaseHistory) {
            throw ApiError.create(404, "Purchase history not found");
        }

        const updatedPurchaseHistory = await PurchaseHistory.findByIdAndUpdate(
            purchaseHistory._id,
            {
                $push: { items: { $each: items } },
                $inc: { amount: additionalAmount }
            },
            { new: true, runValidators: true }
        );

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedPurchaseHistory,
                    "Purchase history updated successfully with new items"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error updating purchase history: " + error.message);
    }
});

export {
    createPurchaseHistory,
    getPurchaseHistoryByUserId,
    getPurchaseHistoryByOrderId,
    deletePurchaseHistory,
    updatePurchaseHistoryItems
}; 