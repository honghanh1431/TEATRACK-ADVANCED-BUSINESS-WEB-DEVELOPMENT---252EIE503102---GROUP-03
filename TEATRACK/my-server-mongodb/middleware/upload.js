// middleware/upload.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cấu hình Cloudinary (Lấy thông tin từ .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình Cloudinary Storage cho multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'teatrack_avatars', // Thư mục lưu trên Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => 'avatar-' + Date.now() + '-' + Math.round(Math.random() * 1e9),
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // Tự động tối ưu kích thước
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});

module.exports = upload;