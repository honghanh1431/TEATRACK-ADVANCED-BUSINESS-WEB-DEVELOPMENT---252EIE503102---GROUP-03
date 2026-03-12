const { ObjectId } = require('mongodb');

let db;
const init = (database) => { db = database; };
const collection = () => db.collection('products');

const findAll = async () => {
  const list = await collection().find({}).toArray();
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
  const id = body.id || 'p' + Date.now();
  const doc = { ...body, id, _id: new ObjectId() };
  await col.insertOne(doc);
  return findAll();
};

const updateById = async (id, body) => {
  const col = collection();
  const filterArr = [{ id: String(id) }];
  try {
    if (ObjectId.isValid(id)) {
      filterArr.push({ _id: new ObjectId(id) });
    }
  } catch (_) { }
  const filter = { $or: filterArr };
  const result = await col.updateOne(filter, { $set: body });
  return result.matchedCount > 0 ? findAll() : null;
};

const deleteById = async (id) => {
  const col = collection();
  const filterArr = [{ id: String(id) }];
  try {
    if (ObjectId.isValid(id)) {
      filterArr.push({ _id: new ObjectId(id) });
    }
  } catch (_) { }
  const filter = { $or: filterArr };
  await col.deleteOne(filter);
  return findAll();
};

module.exports = { init, findAll, findById, create, updateById, deleteById, collection };
