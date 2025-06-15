import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createProduct = asyncHandler(async (req, res) => {
  const { name, price, quantity, discount, barcode, image_url, description } = req.body;

  if (!name || !price || !barcode || quantity === undefined) {
    throw ApiError.create(400, "Name, price, quantity, and barcode are required");
  }

  try {
    const product = await Product.create({
      name,
      price,
      quantity,
      discount,
      barcode,
      image_url,
      description
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
    throw ApiError.create(500, "Error creating product: " + error.message);
  }
});

const getAllProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find(); 

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          products,
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

export {
  createProduct,
  getProductByBarcode,
  deleteProductByBarcode,
  updateProductByBarcode,
  updateProductById,
  getAllProducts
}; 