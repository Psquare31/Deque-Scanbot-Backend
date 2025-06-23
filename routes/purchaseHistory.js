import express from "express";
import {
    createPurchaseHistory,
    getPurchaseHistoryByUserId,
    getPurchaseHistoryByOrderId,
    deletePurchaseHistory,
    updatePurchaseHistoryItems,
    deletePurchaseHistoryItems
} from "../controllers/purchaseHistoryController.js";

const router = express.Router();


router.post("/", createPurchaseHistory);


router.get("/user/:userId", getPurchaseHistoryByUserId);


router.get("/order/:orderId", getPurchaseHistoryByOrderId);


router.delete("/:orderId", deletePurchaseHistory);

router.patch("/user/:userId/items", updatePurchaseHistoryItems);

router.patch("/user/:userId/items/delete", deletePurchaseHistoryItems);

export default router;