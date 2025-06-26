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
        if (!item._id || !item.name || !item.price || !item.barcode || !item.quantity || !item.category) {
            throw ApiError.create(400, "Each item must have _id, name, price, barcode, quantity, and category");
        }
        if (!mongoose.isValidObjectId(item._id)) {
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
                item._id,
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
            .populate('items._id', 'name barcode category');

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
    const { userId } = req.params;
    const { items, additionalAmount } = req.body;

    if (!userId) {
        throw ApiError.create(400, "User ID is required");
    }

    if (!items || !Array.isArray(items)) {
        throw ApiError.create(400, "Items must be an array");
    }

    if (!additionalAmount || typeof additionalAmount !== 'number' || additionalAmount <= 0) {
        throw ApiError.create(400, "Valid additional amount is required");
    }

    try {
        let purchaseHistory = await PurchaseHistory.findOne({ 
            userId, 
            orderId: { $regex: /^draft_/ } 
        });

        if (!purchaseHistory) {
            // Create new draft purchase history
            purchaseHistory = await PurchaseHistory.create({
                userId,
                name: req.body.name || 'User',
                email: req.body.email || 'user@example.com',
                items: items,
                amount: additionalAmount,
                orderId: `draft_${Date.now()}`
            });
        } else {
            // Add new items to existing draft
            const newItems = new Map(items.map(item => [item._id.toString(), item.quantity]));

            // Update product quantities for new items
            for (const [_id, quantity] of newItems) {
                await Product.findByIdAndUpdate(
                    _id,
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
            purchaseHistory.items = updatedItems;
            purchaseHistory.amount = newTotalAmount;
            purchaseHistory.updatedAt = new Date();
            await purchaseHistory.save();
        }

        const updatedHistory = await PurchaseHistory.findById(purchaseHistory._id)
            .populate('items._id', 'name barcode category');

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

// Controller to delete items from a user's purchase history by productId array
const deletePurchaseHistoryItems = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { _ids } = req.body; // Keep as _ids to match frontend

    if (!userId) {
        throw ApiError.create(400, "User ID is required");
    }
    if (!_ids || !Array.isArray(_ids) || _ids.length === 0) {
        throw ApiError.create(400, "_ids must be a non-empty array");
    }

    try {
        const purchaseHistory = await PurchaseHistory.findOne({ 
            userId, 
            orderId: { $regex: /^draft_/ } 
        });
        
        if (!purchaseHistory) {
            throw ApiError.create(404, "Draft purchase history not found");
        }

        // Get items to be removed for product quantity restoration
        const itemsToRemove = purchaseHistory.items.filter(
            item => _ids.includes(item._id.toString())
        );

        // Restore product quantities
        for (const item of itemsToRemove) {
            await Product.findByIdAndUpdate(
                item._id,
                {
                    $inc: {
                        quantity: item.quantity,
                        totalPurchases: -item.quantity
                    }
                }
            );
        }

        // Filter out items whose _id is in _ids
        const remainingItems = purchaseHistory.items.filter(
            item => !_ids.includes(item._id.toString())
        );

        // Recalculate the amount
        const newAmount = remainingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // If no items left, delete the draft
        if (remainingItems.length === 0) {
            await PurchaseHistory.findByIdAndDelete(purchaseHistory._id);
            
            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        null,
                        "All items removed. Draft purchase history deleted."
                    )
                );
        }

        const updatedHistory = await PurchaseHistory.findByIdAndUpdate(
            purchaseHistory._id,
            {
                items: remainingItems,
                amount: newAmount,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('items._id', 'name barcode category');

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedHistory,
                    "Items deleted from purchase history successfully"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error deleting items from purchase history: " + error.message);
    }
});

// Update item quantity in purchase history
const updatePurchaseHistoryItemQuantity = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { item, oldQuantity, newQuantity } = req.body;

    if (!userId) {
        throw ApiError.create(400, "User ID is required");
    }

    if (!item || !item._id || typeof newQuantity !== 'number' || newQuantity <= 0) {
        throw ApiError.create(400, "Valid item and new quantity are required");
    }

    try {
        const purchaseHistory = await PurchaseHistory.findOne({ 
            userId, 
            orderId: { $regex: /^draft_/ } 
        });
        
        if (!purchaseHistory) {
            throw ApiError.create(404, "Draft purchase history not found");
        }

        // Find and update the specific item
        const itemIndex = purchaseHistory.items.findIndex(
            i => i._id.toString() === item._id.toString()
        );

        if (itemIndex === -1) {
            throw ApiError.create(404, "Item not found in purchase history");
        }

        // Update the item quantity
        purchaseHistory.items[itemIndex].quantity = newQuantity;

        // Recalculate total amount
        const newAmount = purchaseHistory.items.reduce(
            (sum, i) => sum + (i.price * i.quantity), 0
        );

        // Update product quantities (adjust for quantity change)
        const quantityDifference = newQuantity - oldQuantity;
        if (quantityDifference !== 0) {
            await Product.findByIdAndUpdate(
                item._id,
                {
                    $inc: {
                        quantity: -quantityDifference,
                        totalPurchases: quantityDifference
                    }
                }
            );
        }

        // Save the updated purchase history
        purchaseHistory.amount = newAmount;
        purchaseHistory.updatedAt = new Date();
        await purchaseHistory.save();

        const updatedHistory = await PurchaseHistory.findById(purchaseHistory._id)
            .populate('items._id', 'name barcode category');

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedHistory,
                    "Purchase history item quantity updated successfully"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error updating item quantity: " + error.message);
    }
});

// Delete draft purchase history
const deletePurchaseHistoryDraft = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        throw ApiError.create(400, "User ID is required");
    }

    try {
        // Find draft purchase history
        const draftHistory = await PurchaseHistory.findOne({ 
            userId, 
            orderId: { $regex: /^draft_/ } 
        });

        if (!draftHistory) {
            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        null,
                        "No draft purchase history found to delete"
                    )
                );
        }

        // Restore product quantities before deleting
        for (const item of draftHistory.items) {
            await Product.findByIdAndUpdate(
                item._id,
                {
                    $inc: {
                        quantity: item.quantity,
                        totalPurchases: -item.quantity
                    }
                }
            );
        }

        // Delete the draft
        await PurchaseHistory.findByIdAndDelete(draftHistory._id);

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    null,
                    "Draft purchase history deleted successfully"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error deleting draft purchase history: " + error.message);
    }
});

// Finalize purchase history after payment
const finalizePurchaseHistory = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { orderId } = req.body;

    if (!userId || !orderId) {
        throw ApiError.create(400, "User ID and Order ID are required");
    }

    try {
        // Find draft purchase history
        const draftHistory = await PurchaseHistory.findOne({ 
            userId, 
            orderId: { $regex: /^draft_/ } 
        });

        if (!draftHistory) {
            throw ApiError.create(404, "Draft purchase history not found");
        }

        // Update with final order ID
        draftHistory.orderId = orderId;
        draftHistory.updatedAt = new Date();
        await draftHistory.save();

        const finalizedHistory = await PurchaseHistory.findById(draftHistory._id)
            .populate('items._id', 'name barcode category');

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    finalizedHistory,
                    "Purchase history finalized successfully"
                )
            );
    } catch (error) {
        throw ApiError.create(500, "Error finalizing purchase history: " + error.message);
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
            if (!rating._id || typeof rating.rating !== 'number' || rating.rating < 1 || rating.rating > 5) {
                throw ApiError.create(400, "Each rating must have a valid _id and rating between 1 and 5");
            }
        }

        // Update product ratings and purchase history items
        const updatedItems = purchaseHistory.items.map(item => {
            const rating = ratings.find(r => r._id.toString() === item._id.toString());
            if (rating) {
                return { ...item.toObject(), rating: rating.rating };
            }
            return item;
        });

        // Update product ratings
        for (const rating of ratings) {
            const product = await Product.findById(rating._id);
            if (!product) {
                throw ApiError.create(404, `Product with ID ${rating._id} not found`);
            }

            // Calculate new average rating
            const newTotalPurchases = product.totalPurchases;
            const newRating = ((product.rating * product.totalPurchases) + rating.rating) / (newTotalPurchases + 1);

            await Product.findByIdAndUpdate(
                rating._id,
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
        ).populate('items._id', 'name barcode category');

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
    addRatingToPurchase,
    deletePurchaseHistoryItems,
    updatePurchaseHistoryItemQuantity,
    deletePurchaseHistoryDraft,
    finalizePurchaseHistory
};