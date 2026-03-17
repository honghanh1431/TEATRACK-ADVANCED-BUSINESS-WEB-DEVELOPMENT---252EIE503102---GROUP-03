const express = require('express');
const router = express.Router();
const { register, login, adminLogin, updateProfile, updateUsername, changePassword } = require('../controllers/authController');const { forgotPassword, verifyOtp, resetPassword } = require('../controllers/forgotPasswordController'); 
const { verifyToken, checkAdmin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const upload = require('../middleware/upload');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
// Forgot password routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// GET profile - lấy thông tin đầy đủ từ MongoDB
router.get('/profile', verifyToken, async (req, res) => {
  try {
    console.log('GET /profile: Request received.');
    // middleware đã fetch user rồi, trả về luôn không cần query lại
    if (!req.user) {
      console.error('GET /profile: req.user is missing after verifyToken middleware!');
      return res.status(500).json({ message: 'User data missing from request after authentication' });
    }
    console.log('GET /profile: req.user found, userId:', req.user._id);
    // Ensure userWithoutPassword is correctly defined from req.user
    const { password, ...userWithoutPassword } = req.user;
    console.log('GET /profile: Returning user profile (without password).');
    res.json({ user: userWithoutPassword });
  } catch (err) {
    console.error('GET /profile error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
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