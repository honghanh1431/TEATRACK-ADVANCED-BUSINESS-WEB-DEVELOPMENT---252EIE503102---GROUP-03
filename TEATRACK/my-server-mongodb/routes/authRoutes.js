const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { forgotPassword, verifyOtp, resetPassword } = require('../controllers/forgotPasswordController'); 
const { verifyToken, checkAdmin } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
// Forgot password routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
// Example protected route (optional, for testing)
router.get('/profile', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Admin only route example
router.get('/admin', verifyToken, checkAdmin, (req, res) => {
  res.json({ message: 'Welcome admin', user: req.user });
});

module.exports = router;