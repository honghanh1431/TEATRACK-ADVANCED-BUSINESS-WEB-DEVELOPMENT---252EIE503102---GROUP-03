const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const Cart = require('../models/Cart');

// Lấy giỏ hàng của user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.getCartByUserId(userId);
    res.json({ items: cart ? cart.items : [] });
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cập nhật giỏ hàng
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array' });
    }
    await Cart.updateCart(userId, items);
    res.json({ message: 'Cart updated' });
  } catch (err) {
    console.error('Update cart error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Xóa giỏ hàng (khi checkout)
router.delete('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    await Cart.deleteCart(userId);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    console.error('Delete cart error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;