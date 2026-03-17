const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');
const { verifyAdminToken } = require('../middleware/adminMiddleware');

// @desc    Get all promotions (admin)
// @route   GET /api/promotions/admin
router.get('/admin', verifyAdminToken, async (req, res) => {
  try {
    const promotions = await Promotion.getAllPromotions();
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get active promotions (public)
// @route   GET /api/promotions
router.get('/', async (req, res) => {
  try {
    const promotions = await Promotion.collection().find({ isActive: { $ne: false } }).sort({ createdAt: -1 }).toArray();
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Check a voucher code (public/user)
// @route   GET /api/promotions/:code
router.get('/:code', async (req, res) => {
  try {
    const promotion = await Promotion.getPromotionByCode(req.params.code);
    
    if (!promotion || promotion.isActive === false) {
      return res.status(404).json({ message: 'Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa.' });
    }
    
    res.json(promotion);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Create a promotion (admin)
// @route   POST /api/promotions
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const { code } = req.body;
    
    // Check if code already exists
    const existing = await Promotion.getPromotionByCode(code);
    if (existing) {
      return res.status(400).json({ message: 'Mã giảm giá đã tồn tại.' });
    }
    
    const promotion = await Promotion.createPromotion(req.body);
    
    // Notify clients
    req.app.get('io').emit('promotionUpdated', { action: 'create', code: promotion.code });
    
    res.status(201).json(promotion);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Update a promotion (admin)
// @route   PUT /api/promotions/:id
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const updated = await Promotion.updatePromotion(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy mã giảm giá hoặc không có thay đổi.' });
    }
    
    // Notify clients
    req.app.get('io').emit('promotionUpdated', { action: 'update', id: req.params.id });
    
    res.json({ message: 'Cập nhật mã giảm giá thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Delete a promotion (admin)
// @route   DELETE /api/promotions/:id
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const deleted = await Promotion.deletePromotion(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy mã giảm giá.' });
    }
    
    // Notify clients
    req.app.get('io').emit('promotionUpdated', { action: 'delete', id: req.params.id });
    
    res.json({ message: 'Xóa mã giảm giá thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
