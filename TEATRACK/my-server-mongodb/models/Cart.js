const { ObjectId } = require('mongodb');

let db;
const init = (database) => { db = database; };

const collection = () => db.collection('carts');

const getCartByUserId = async (userId) => {
  return await collection().findOne({ userId: new ObjectId(userId) });
};

const updateCart = async (userId, items) => {
  const result = await collection().updateOne(
    { userId: new ObjectId(userId) },
    { $set: { items, updatedAt: new Date() } },
    { upsert: true }
  );
  return result;
};

const deleteCart = async (userId) => {
  return await collection().deleteOne({ userId: new ObjectId(userId) });
};

module.exports = {
  init,
  getCartByUserId,
  updateCart,
  deleteCart,
  collection
};