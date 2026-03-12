const express = require('express');
const router = express.Router();

let db;
const init = (database) => { db = database; };

// GET /api/agencies – Lấy danh sách chi nhánh (public, không cần auth)
router.get('/', async (req, res) => {
    try {
        const agencies = await db.collection('agencies')
            .find({}, { projection: { name: 1, address: 1, phone: 1 } })
            .sort({ name: 1 })
            .toArray();
        res.json(agencies);
    } catch (err) {
        console.error('Get agencies error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = { router, init };
