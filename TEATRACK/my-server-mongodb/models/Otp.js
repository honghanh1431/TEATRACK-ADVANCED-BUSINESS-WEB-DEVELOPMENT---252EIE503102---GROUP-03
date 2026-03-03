const { MongoClient, ObjectId } = require('mongodb');

let db;
const init = (database) => { db = database; };
const collection = () => db.collection('otp');

const saveOtp = async (email, otp, expiresAt) => {
  const otps = collection();
  await otps.deleteMany({ email });
  await otps.insertOne({ email, otp, expiresAt, createdAt: new Date() });
};

const findOtp = async (email, otp) => {
  const otps = collection();
  return await otps.findOne({ email, otp });
};

const deleteOtp = async (email) => {
  const otps = collection();
  await otps.deleteMany({ email });
};
const findOtpByEmail = async (email) => {
  const otps = collection();
  return await otps.findOne({ email });
};

module.exports = { init, saveOtp, findOtp, findOtpByEmail, deleteOtp };