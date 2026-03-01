const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

async function createAdmin() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    const db = client.db('TeaTrack');
    const users = db.collection('users');

    const adminData = {
      username: 'Admin123',                
      name: 'Administrator',
      email: 'admin@teatrack.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      phone: '',
      address: '',
      createdAt: new Date()
    };

    const existing = await users.findOne({
      $or: [
        { email: adminData.email },
        { username: adminData.username }
      ]
    });
    if (existing) {
      console.log(' Username hoặc email đã tồn tại.');
      return;
    }

    const result = await users.insertOne(adminData);
    console.log(' Tài khoản admin đã được tạo thành công!');
    console.log(' Username:', adminData.username);
    console.log(' Email:', adminData.email);
    console.log(' Mật khẩu: admin123');
  } catch (error) {
    console.error(' Lỗi:', error);
  } finally {
    await client.close();
  }
}

createAdmin();