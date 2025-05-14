class PurchaseHistoryController {
  async createPurchaseHistory(req, res) {
    const { userId, name, email, items, amount, orderId } = req.body;

    try {
      const purchaseHistory = new PurchaseHistory({
        userId,
        name,
        email,
        items,
        quantity,
        amount,
        orderId,//if exists
      });

      await purchaseHistory.save();
      res.status(201).json(purchaseHistory);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = PurchaseHistoryController;