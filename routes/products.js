import express from "express";
import {
    createProduct,
    getProductByBarcode,
    deleteProductByBarcode,
    updateProductByBarcode,
    getAllProducts,
    updateProductById,
} from "../controllers/productController.js";

const router = express.Router();

router.post("/", createProduct);
router.get("/:barcode", getProductByBarcode);
router.get("/", getAllProducts);

router.delete("/:barcode", deleteProductByBarcode);
router.put("/barcode/:barcode", updateProductByBarcode);
router.put("/:id", updateProductById);

export default router; 