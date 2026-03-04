// middleware/upload.js
const multer = require('multer');
const path = require('path');

// Cấu hình nơi lưu file và tên file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/'); // thư mục lưu ảnh
  },
  filename: (req, file, cb) => {
    // Tạo tên file duy nhất: thời gian + số ngẫu nhiên + phần mở rộng
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

// Lọc file chỉ chấp nhận ảnh
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // giới hạn 5MB
  fileFilter: fileFilter
});

module.exports = upload;