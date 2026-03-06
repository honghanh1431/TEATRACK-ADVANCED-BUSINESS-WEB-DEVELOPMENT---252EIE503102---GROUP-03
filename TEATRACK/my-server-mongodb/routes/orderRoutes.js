const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const Order = require('../models/Order');

// Tạo đơn hàng mới
router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const orderData = req.body;

        // Lưu đơn vào DB
        const createdOrder = await Order.createOrder(userId, orderData);
        res.status(201).json(createdOrder);
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Lấy danh sách đơn hàng của user
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const orders = await Order.getOrdersByUserId(userId);
        res.json({ orders });
    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Hủy đơn hàng (nếu đang pending)
router.patch('/:id/cancel', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const orderId = req.params.id; // order.id (VD: '#DH-20240301')

        const result = await Order.cancelOrder(orderId, userId);
        if (result.modifiedCount === 0) {
            return res.status(400).json({ message: 'Không thể hủy đơn hàng này (không tồn tại hoặc đã được xử lý).' });
        }
        res.json({ message: 'Hủy đơn hàng thành công.' });
    } catch (err) {
        console.error('Cancel order error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
