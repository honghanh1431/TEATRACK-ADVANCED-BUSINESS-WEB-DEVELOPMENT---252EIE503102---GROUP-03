const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// GET /api/contacts – Lấy danh sách phản hồi (admin)
router.get('/', async (req, res) => {
    try {
        const list = await Contact.findAll();
        res.json(list);
    } catch (err) {
        console.error('Get contacts error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/contacts – Khách hàng gửi phản hồi mới (public)
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const list = await Contact.create(body);
        res.json(list);
    } catch (err) {
        console.error('Post contacts error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/contacts/:id – Cập nhật trạng thái/ghi chú/đã đọc (admin)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const list = await Contact.updateById(id, req.body);
        if (list === null) return res.status(404).json({ message: 'Not found' });
        res.json(list);
    } catch (err) {
        console.error('Put contacts error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
