const { ObjectId } = require('mongodb');

let db;
const init = (database) => { db = database; };
const collection = () => db.collection('contacts');

const findAll = async () => {
    const list = await collection().find({}).sort({ time: -1 }).toArray();
    return list.map((doc) => ({ ...doc, id: doc._id?.toString() }));
};

const findById = async (id) => {
    const col = collection();
    let doc;
    try {
        doc = await col.findOne({ _id: new ObjectId(id) });
    } catch (_) {
        doc = await col.findOne({ id: String(id) });
    }
    if (!doc) return null;
    return { ...doc, id: doc._id?.toString() };
};

const create = async (body) => {
    const col = collection();
    const doc = { 
        ...body, 
        status: body.status ?? 0, 
        read: body.read ?? false,
        note: body.note ?? "",
        time: body.time || new Date().toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).replace(',', '')
    };
    if (doc._id) delete doc._id;
    await col.insertOne(doc);
    return findAll();
};

const updateById = async (id, body) => {
    const col = collection();
    let filter;
    try {
        filter = { _id: new ObjectId(id) };
    } catch (_) {
        filter = { id: String(id) };
    }
    const result = await col.updateOne(filter, { $set: body });
    return result.matchedCount > 0 ? findAll() : null;
};

const deleteById = async (id) => {
    const col = collection();
    let filter;
    try {
        filter = { _id: new ObjectId(id) };
    } catch (_) {
        filter = { id: String(id) };
    }
    await col.deleteOne(filter);
    return findAll();
};

module.exports = { init, findAll, findById, create, updateById, deleteById, collection };
