const { ObjectId } = require('mongodb');

let db;
const init = (database) => { db = database; };

const collection = () => db.collection('orders');

const createOrder = async (userId, orderData) => {
    const newOrder = {
        ...orderData,
        userId: userId ? new ObjectId(userId) : null,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const result = await collection().insertOne(newOrder);
    return { ...newOrder, _id: result.insertedId };
};

const getOrdersByUserId = async (userId) => {
    return await collection().find({ userId: new ObjectId(userId) }).sort({ createdAt: -1 }).toArray();
};

const cancelOrder = async (orderId, userId) => {
    // Chỉ cập nhật nếu đơn có trùng userId và status là pending
    const filter = {
        id: orderId,
        userId: new ObjectId(userId),
        status: 'pending'
    };
    const update = {
        $set: { status: 'cancelled', updatedAt: new Date() }
    };
    const result = await collection().updateOne(filter, update);
    return result;
};

module.exports = {
    init,
    createOrder,
    getOrdersByUserId,
    cancelOrder,
    collection
};
