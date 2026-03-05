const { ObjectId } = require('mongodb');

let db;
const init = (database) => { db = database; };
const collection = () => db.collection('reviews');

const findAll = async (productId = null) => {
  const col = collection();
  const filter = productId ? { productId: String(productId) } : {};
  const list = await col.find(filter).sort({ createdAt: -1 }).toArray();
  return list.map((doc) => ({ ...doc, id: doc.id || doc._id?.toString() }));
};

const findById = async (id) => {
  const col = collection();
  let doc = await col.findOne({ id: String(id) });
  if (!doc) {
    try {
      doc = await col.findOne({ _id: new ObjectId(id) });
    } catch (_) {}
  }
  if (!doc) return null;
  return { ...doc, id: doc.id || doc._id?.toString() };
};

const create = async (body) => {
  const col = collection();
  const id = body.id || 'rev' + Date.now();
  const createdAt = body.createdAt != null ? body.createdAt : Date.now();
  const doc = { ...body, id, createdAt, _id: new ObjectId() };
  await col.insertOne(doc);
  return findAll();
};

const updateById = async (id, body) => {
  const col = collection();
  const filter = { $or: [{ id: String(id) }, { _id: new ObjectId(id) }] };
  const result = await col.updateOne(filter, { $set: body });
  return result.matchedCount > 0 ? findAll() : null;
};

const deleteById = async (id) => {
  const col = collection();
  const filter = { $or: [{ id: String(id) }, { _id: new ObjectId(id) }] };
  await col.deleteOne(filter);
  return findAll();
};

module.exports = { init, findAll, findById, create, updateById, deleteById, collection };
