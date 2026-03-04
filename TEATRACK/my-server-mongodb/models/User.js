const { MongoClient, ObjectId } = require('mongodb');

let db;
const init = (database) => { db = database; };

const collection = () => db.collection('users');

const createUser = async (userData) => {
  const users = collection();
  // Kiểm tra email và username đã tồn tại chưa
  const existing = await users.findOne({
    $or: [
      { email: userData.email },
      { username: userData.username }
    ]
  });
  if (existing) {
    if (existing.email === userData.email) throw new Error('Email already exists');
    if (existing.username === userData.username) throw new Error('Username already exists');
  }
  
  const newUser = {
    username: userData.username,   
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role: userData.role || 'customer',
    phone: userData.phone || '',
    address: userData.address || '',
    dob: userData.dob || null,
    gender: userData.gender || '',
    avatar: userData.avatar || '', 
    createdAt: new Date()
  };
  const result = await users.insertOne(newUser);
  return { ...newUser, _id: result.insertedId };
};
// Cập nhật thông tin user (chỉ cho phép sửa các trường cơ bản)
const updateUserById = async (id, updateData) => {
  const users = collection();
  // Loại bỏ các trường không được phép sửa
  const allowed = ['name', 'email', 'phone', 'address', 'dob', 'gender', 'avatar', 'username', 'password'];
  const update = {};
  for (let key of allowed) {
    if (updateData[key] !== undefined) update[key] = updateData[key];
  }
  if (Object.keys(update).length === 0) return null;
  
  const result = await users.updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );
  return result.modifiedCount > 0;
};

// Tìm user theo username hoặc email (dùng cho login)
const findUserByIdentifier = async (identifier) => {
  const users = collection();
  return await users.findOne({
    $or: [
      { username: identifier },
      { email: identifier }
    ]
  });
};

const findUserByEmail = async (email) => {
  const users = collection();
  return await users.findOne({ email });
};

const findUserByUsername = async (username) => {
  const users = collection();
  return await users.findOne({ username });
};

const findUserById = async (id) => {
  const users = collection();
  return await users.findOne({ _id: new ObjectId(id) });
};
const updatePassword = async (email, hashedPassword) => {
  const users = collection();
  return await users.updateOne({ email }, { $set: { password: hashedPassword } });
};

module.exports = {
  init,
  createUser,
  findUserByIdentifier,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  updateUserById,
  updatePassword,
  collection
};