import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createProduct = asyncHandler(async (req, res) => {
  const { 
    name, 
    price, 
    quantity, 
    discount, 
    barcode, 
    image_url, 
    description,
    category,
    tags,
    rating,
    totalPurchases,
    similarProducts
  } = req.body;

  // Required fields validation
  if (!name || !price || !barcode || quantity === undefined || !category) {
    throw ApiError.create(400, "Name, price, quantity, barcode, and category are required");
  }

  // Validate category
  if (typeof category !== 'string' || category.trim() === '') {
    throw ApiError.create(400, "Category must be a non-empty string");
  }

  // Validate tags if provided
  if (tags && (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string'))) {
    throw ApiError.create(400, "Tags must be an array of strings");
  }

  // Validate similar products if provided
  if (similarProducts) {
    if (!Array.isArray(similarProducts) || 
        !similarProducts.every(id => mongoose.isValidObjectId(id))) {
      throw ApiError.create(400, "Similar products must be an array of valid product IDs");
    }
  }

  try {
    const product = await Product.create({
      name,
      price,
      quantity,
      discount: discount || 0,
      barcode,
      image_url,
      description,
      category,
      tags: tags || [],
      rating: rating || 0,
      totalPurchases: totalPurchases || 0,
      similarProducts: similarProducts || []
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          product,
          "Product created successfully"
        )
      );
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      throw ApiError.create(400, "Product with this barcode already exists");
    }
    throw ApiError.create(500, "Error creating product: " + error.message);
  }
});

const getAllProducts = asyncHandler(async (req, res) => {
  try {
    const { 
      category,
      minPrice,
      maxPrice,
      minRating,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (minRating) filter.rating = { $gte: Number(minRating) };

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter).sort(sort);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            products,
            count: products.length,
            filters: {
              category,
              priceRange: { min: minPrice, max: maxPrice },
              minRating
            }
          },
          "Products fetched successfully"
        )
      );
  } catch (error) {
    throw ApiError.create(500, "Error fetching products: " + error.message);
  }
});

const getProductByBarcode = asyncHandler(async (req, res) => {
  const { barcode } = req.params;

  if (!barcode) {
    throw ApiError.create(400, "Barcode is required");
  }

  try {
    const product = await Product.findOne({ barcode });

    if (!product) {
      throw ApiError.create(404, "Product not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          product,
          "Product retrieved successfully"
        )
      );
  } catch (error) {
    throw ApiError.create(500, "Error retrieving product: " + error.message);
  }
});


const deleteProductByBarcode = asyncHandler(async (req, res) => {
  const { barcode } = req.params;

  if (!barcode) {
    throw ApiError.create(400, "Barcode is required");
  }

  try {
    const result = await Product.deleteOne({ barcode });

    if (result.deletedCount === 0) {
      throw ApiError.create(404, "Product not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "Product deleted successfully"
        )
      );
  } catch (error) {
    throw ApiError.create(500, "Error deleting product: " + error.message);
  }
});

const updateProductByBarcode = asyncHandler(async (req, res) => {
  const { barcode } = req.params;
  const updates = req.body;

  if (!barcode) {
    throw ApiError.create(400, "Barcode is required");
  }

  if (Object.keys(updates).length === 0) {
    throw ApiError.create(400, "No update data provided");
  }

  // Validate updates
  if (updates.category && (typeof updates.category !== 'string' || updates.category.trim() === '')) {
    throw ApiError.create(400, "Category must be a non-empty string");
  }

  if (updates.tags && (!Array.isArray(updates.tags) || !updates.tags.every(tag => typeof tag === 'string'))) {
    throw ApiError.create(400, "Tags must be an array of strings");
  }

  if (updates.similarProducts && 
      (!Array.isArray(updates.similarProducts) || 
       !updates.similarProducts.every(id => mongoose.isValidObjectId(id)))) {
    throw ApiError.create(400, "Similar products must be an array of valid product IDs");
  }

  try {
    const product = await Product.findOneAndUpdate(
      { barcode },
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      throw ApiError.create(404, "Product not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          product,
          "Product updated successfully"
        )
      );
  } catch (error) {
    throw ApiError.create(500, "Error updating product: " + error.message);
  }
});

const updateProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.create(400, "Invalid product ID");
  }

  if (Object.keys(updates).length === 0) {
    throw ApiError.create(400, "No update data provided");
  }

  try {
    const product = await Product.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      throw ApiError.create(404, "Product not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          product,
          "Product updated successfully"
        )
      );
  } catch (error) {
    throw ApiError.create(500, "Error updating product: " + error.message);
  }
});

// Add new method to update product rating
const updateProductRating = asyncHandler(async (req, res) => {
  const { barcode } = req.params;
  const { rating, incrementPurchases = true } = req.body;

  if (!barcode) {
    throw ApiError.create(400, "Barcode is required");
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    throw ApiError.create(400, "Rating must be a number between 1 and 5");
  }

  try {
    const product = await Product.findOne({ barcode });
    if (!product) {
      throw ApiError.create(404, "Product not found");
    }

    // Calculate new average rating
    const newTotalPurchases = incrementPurchases ? product.totalPurchases + 1 : product.totalPurchases;
    const newRating = ((product.rating * product.totalPurchases) + rating) / newTotalPurchases;

    const updatedProduct = await Product.findOneAndUpdate(
      { barcode },
      {
        rating: Number(newRating.toFixed(1)),
        totalPurchases: newTotalPurchases
      },
      { new: true, runValidators: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedProduct,
          "Product rating updated successfully"
        )
      );
  } catch (error) {
    throw ApiError.create(500, "Error updating product rating: " + error.message);
  }
});

export {
  createProduct,
  getProductByBarcode,
  deleteProductByBarcode,
  updateProductByBarcode,
  updateProductById,
  getAllProducts,
  updateProductRating
}; 