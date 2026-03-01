const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, name, email, password, phone, address } = req.body;

    // Basic validation
    if (!username || !name || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, name, email and password' });
    }

    // Kiểm tra username và email đã tồn tại chưa (model đã làm)
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.createUser({
      username,
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      address: address || '',
      role: 'customer'
    });

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ message: 'User registered successfully', user: userWithoutPassword });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Login user (with username or email)
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier có thể là username hoặc email

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide identifier and password' });
    }

    // Tìm user theo username hoặc email
    const user = await User.findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login successful', token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, login };