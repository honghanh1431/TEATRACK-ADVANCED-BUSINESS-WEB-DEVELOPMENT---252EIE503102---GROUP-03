const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/adminMiddleware');

// Import controllers (sẽ tạo sau)
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');

// Áp dụng middleware admin cho tất cả routes
router.use(verifyAdminToken);

// @desc    Get all products (admin)
// @route   GET /api/admin/products
router.get('/products', async (req, res) => {
  try {
    // TODO: Implement get all products
    res.json({ message: 'Get products - TODO' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Create product (admin)
// @route   POST /api/admin/products
router.post('/products', async (req, res) => {
  try {
    // TODO: Implement create product
    res.json({ message: 'Create product - TODO' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Update product (admin)
// @route   PUT /api/admin/products/:id
router.put('/products/:id', async (req, res) => {
  try {
    // TODO: Implement update product
    res.json({ message: 'Update product - TODO' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Delete product (admin)
// @route   DELETE /api/admin/products/:id
router.delete('/products/:id', async (req, res) => {
  try {
    // TODO: Implement delete product
    res.json({ message: 'Delete product - TODO' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get all users (admin)
// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.findUsersByRole('customer'); // Chỉ lấy customer
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    res.json({ users: usersWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Update user role (admin)
// @route   PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const updated = await User.updateUserById(req.params.id, { role });
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Delete user (admin)
// @route   DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    // TODO: Implement delete user (soft delete recommended)
    res.json({ message: 'Delete user - TODO' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.getAllOrders();
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Update order status (admin)
// @route   PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id; // Có thể là _id hoặc id custom

    const updated = await Order.updateOrderStatus(orderId, status);
    if (!updated) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Thống kê đơn hàng và doanh thu theo chi nhánh (admin)
// @route   GET /api/admin/orders/agency-stats
router.get('/orders/agency-stats', async (req, res) => {
  try {
    const stats = await Order.collection().aggregate([
      {
        $group: {
          _id: '$deliveryAgency',
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // Chuẩn hóa: null / undefined → "Chưa xác định"
    const normalized = stats.map(s => ({
      agency: s._id || 'Chưa xác định',
      count: s.count,
      revenue: s.revenue || 0
    }));

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;