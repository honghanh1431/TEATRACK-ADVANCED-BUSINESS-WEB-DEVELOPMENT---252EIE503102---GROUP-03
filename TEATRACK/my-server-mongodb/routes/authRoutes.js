const express = require('express');
const router = express.Router();
const { register, login, updateProfile, updateUsername, changePassword } = require('../controllers/authController');const { forgotPassword, verifyOtp, resetPassword } = require('../controllers/forgotPasswordController'); 
const { verifyToken, checkAdmin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const upload = require('../middleware/upload');

// Public routes
router.post('/register', register);
router.post('/login', login);
// Forgot password routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// GET profile - lấy thông tin đầy đủ từ MongoDB
router.get('/profile', verifyToken, async (req, res) => {
  try {
    // middleware đã fetch user rồi, trả về luôn không cần query lại
    const { password, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sửa route PUT /profile: thêm upload.single('avatar') để nhận file từ form field 'avatar'
router.put('/profile', verifyToken, upload.single('avatar'), updateProfile);

// Admin only route example
router.get('/admin', verifyToken, checkAdmin, (req, res) => {
  res.json({ message: 'Welcome admin', user: req.user });
});
router.put('/username', verifyToken, updateUsername);
router.post('/change-password', verifyToken, changePassword);
module.exports = router;