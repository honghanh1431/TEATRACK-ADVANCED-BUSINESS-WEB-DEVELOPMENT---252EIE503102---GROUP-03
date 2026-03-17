const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

let db;
const init = (database) => { db = database; };

const collection = () => db.collection('agencies');

// GET /api/agencies – Lấy danh sách chi nhánh
router.get('/', async (req, res) => {
    try {
        const agencies = await collection()
            .find({})
            .sort({ name: 1 })
            .toArray();
        res.json(agencies);
    } catch (err) {
        console.error('Get agencies error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/agencies – Thêm chi nhánh mới
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const doc = { 
            ...body, 
            createdAt: new Date().toISOString(),
            status: body.status || 'active'
        };
        if (doc._id) delete doc._id;
        await collection().insertOne(doc);
        const list = await collection().find({}).sort({ name: 1 }).toArray();
        res.json(list);
    } catch (err) {
        console.error('Post agencies error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/agencies/:id – Cập nhật chi nhánh
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        if (body._id) delete body._id;

        let filter;
        try {
            filter = { _id: new ObjectId(id) };
        } catch (_) {
            filter = { id: String(id) };
        }

        await collection().updateOne(filter, { $set: body });
        const list = await collection().find({}).sort({ name: 1 }).toArray();
        res.json(list);
    } catch (err) {
        console.error('Put agencies error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/agencies/:id – Xóa chi nhánh
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let filter;
        try {
            filter = { _id: new ObjectId(id) };
        } catch (_) {
            filter = { id: String(id) };
        }

        await collection().deleteOne(filter);
        const list = await collection().find({}).sort({ name: 1 }).toArray();
        res.json(list);
    } catch (err) {
        console.error('Delete agencies error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = { router, init };

