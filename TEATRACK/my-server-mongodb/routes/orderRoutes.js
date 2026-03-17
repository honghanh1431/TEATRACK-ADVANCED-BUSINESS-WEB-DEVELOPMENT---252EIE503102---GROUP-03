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
        
        // Notify admin
        req.app.get('io').emit('orderCreated', { order: createdOrder });
        
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

// Lấy 1 đơn hàng cụ thể
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const orderId = req.params.id;
        const order = await Order.findOrderById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }

        // Kiểm tra xem đơn hàng này có phải của user đang đăng nhập không
        if (String(order.userId) !== String(userId)) {
            return res.status(403).json({ message: 'Bạn không có quyền xem đơn hàng này.' });
        }

        res.json({ order });
    } catch (err) {
        console.error('Get single order error:', err);
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

        // Notify admin that order was cancelled by user
        req.app.get('io').emit('orderUpdated', { orderId, status: 'canceled', by: 'user' });

        res.json({ message: 'Hủy đơn hàng thành công.' });
    } catch (err) {
        console.error('Cancel order error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
