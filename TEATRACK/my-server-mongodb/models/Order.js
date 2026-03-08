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

const getAllOrders = async () => {
    return await collection().find({}).sort({ createdAt: -1 }).toArray();
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

const updateOrderStatus = async (id, status) => {
    // id ở đây là _id của MongoDB
    try {
        const result = await collection().updateOne(
            { _id: new ObjectId(id) },
            { $set: { status, updatedAt: new Date() } }
        );
        return result.modifiedCount > 0;
    } catch (e) {
        // Dự phòng nếu id truyền vào không phải là ObjectId (ví dụ ID chuỗi Custom #DH...)
        const result = await collection().updateOne(
            { id: id },
            { $set: { status, updatedAt: new Date() } }
        );
        return result.modifiedCount > 0;
    }
};

const findOrderById = async (orderId) => {
    try {
        let order = await collection().findOne({ _id: new ObjectId(orderId) });
        if (!order) {
            order = await collection().findOne({ id: orderId });
        }
        return order;
    } catch (e) {
        return await collection().findOne({ id: orderId });
    }
};

module.exports = {
    init,
    createOrder,
    getOrdersByUserId,
    findOrderById,
    getAllOrders,
    cancelOrder,
    updateOrderStatus,
    collection
};
