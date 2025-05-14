const express = require('express');
const PurchaseHistoryController = require('../controllers/puchaseHistoryController');

const router = express.Router();
const purchaseHistoryController = new PurchaseHistoryController();

// POST route to create purchase history
router.post('/', purchaseHistoryController.createPurchaseHistory.bind(purchaseHistoryController));

module.exports = router;