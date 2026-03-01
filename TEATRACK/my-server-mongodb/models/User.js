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
    username: userData.username,   // thêm username
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role: userData.role || 'customer',
    phone: userData.phone || '',
    address: userData.address || '',
    createdAt: new Date()
  };
  const result = await users.insertOne(newUser);
  return { ...newUser, _id: result.insertedId };
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

module.exports = { init, createUser, findUserByIdentifier, findUserByEmail, findUserByUsername, findUserById };