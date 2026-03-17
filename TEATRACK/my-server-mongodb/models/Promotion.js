const { ObjectId } = require('mongodb');

let db;
const init = (database) => { db = database; };

const collection = () => db.collection('vouchers');

const getAllPromotions = async () => {
  return await collection().find({}).sort({ createdAt: -1 }).toArray();
};

const getPromotionByCode = async (code) => {
  return await collection().findOne({ code: code.toUpperCase(), isActive: { $ne: false } });
};

const getPromotionById = async (id) => {
  return await collection().findOne({ _id: new ObjectId(id) });
};

const createPromotion = async (data) => {
  const newPromotion = {
    code: data.code.toUpperCase().trim(),
    type: data.type || 'amount',
    value: Number(data.value) || 0,
    minSubtotal: Number(data.minSubtotal) || 0,
    max: data.max ? Number(data.max) : null,
    description: data.description || '',
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const result = await collection().insertOne(newPromotion);
  return { ...newPromotion, _id: result.insertedId };
};

const updatePromotion = async (id, data) => {
  const update = {
    updatedAt: new Date()
  };
  
  if (data.code) update.code = data.code.toUpperCase().trim();
  if (data.type) update.type = data.type;
  if (data.value !== undefined) update.value = Number(data.value);
  if (data.minSubtotal !== undefined) update.minSubtotal = Number(data.minSubtotal);
  if (data.max !== undefined) update.max = data.max ? Number(data.max) : null;
  if (data.description !== undefined) update.description = data.description;
  if (data.isActive !== undefined) update.isActive = data.isActive;

  const result = await collection().updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );
  return result.modifiedCount > 0;
};

const deletePromotion = async (id) => {
  const result = await collection().deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
};

module.exports = {
  init,
  getAllPromotions,
  getPromotionByCode,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  collection
};
