const { ObjectId } = require('mongodb');

let db;
const init = (database) => { db = database; };
const collection = () => db.collection('agencies');

const findAll = async () => {
  const list = await collection().find({}).sort({ name: 1 }).toArray();
  return list.map((doc) => ({ ...doc, _id: doc._id?.toString() }));
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
  return { ...doc, _id: doc._id?.toString() };
};

const create = async (body) => {
  const col = collection();
  const doc = { ...body, createdAt: new Date().toISOString() };
  if (doc._id) delete doc._id; // Let MongoDB generate its own ObjectId
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
