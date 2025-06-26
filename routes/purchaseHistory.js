import express from "express";
import {
    createPurchaseHistory,
    getPurchaseHistoryByUserId,
    getPurchaseHistoryByOrderId,
    deletePurchaseHistory,
    updatePurchaseHistoryItems,
    deletePurchaseHistoryItems,
    updatePurchaseHistoryItemQuantity,
    deletePurchaseHistoryDraft,
    finalizePurchaseHistory
} from "../controllers/purchaseHistoryController.js";

const router = express.Router();

router.post("/", createPurchaseHistory);
router.get("/user/:userId", getPurchaseHistoryByUserId);
router.get("/order/:orderId", getPurchaseHistoryByOrderId);
router.delete("/:orderId", deletePurchaseHistory);

// Draft management routes
router.patch("/user/:userId/items", updatePurchaseHistoryItems);
router.patch("/user/:userId/items/delete", deletePurchaseHistoryItems);
router.patch("/user/:userId/items/update", updatePurchaseHistoryItemQuantity);
router.delete("/user/:userId/draft", deletePurchaseHistoryDraft);
router.patch("/user/:userId/finalize", finalizePurchaseHistory);

export default router;