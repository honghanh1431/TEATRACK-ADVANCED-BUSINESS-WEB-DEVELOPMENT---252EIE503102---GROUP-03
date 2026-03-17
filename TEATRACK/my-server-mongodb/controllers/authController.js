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

    if (user.status === 'locked') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa' });
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

    await User.recordLogin(user._id);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login successful', token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, email, phone, address, dob, gender } = req.body;

    // Xử lý avatar
    let avatarPath;
    if (req.file) {
      // Trường hợp 1: có upload file mới
      avatarPath = '/uploads/avatars/' + req.file.filename;
    } else if (req.body.avatar !== undefined) {
      // Trường hợp 2: không có file nhưng có trường avatar (có thể là '' để xóa)
      avatarPath = req.body.avatar;
    }
    // Trường hợp 3: không có file và không có trường avatar -> không cập nhật avatar

    // Kiểm tra email trùng (giữ nguyên)
    if (email) {
      const existingUser = await User.findUserByEmail(email);
      if (existingUser && !existingUser._id.equals(userId)) {
        return res.status(400).json({ message: 'Email đã được sử dụng' });
      }
    }

    // Tạo object chỉ chứa các trường có thay đổi
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (dob !== undefined) updateData.dob = dob;
    if (gender !== undefined) updateData.gender = gender;
    if (avatarPath !== undefined) updateData.avatar = avatarPath;

    // Nếu không có gì để cập nhật
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào được cập nhật' });
    }

    // Thực hiện cập nhật
    const updated = await User.updateUserById(userId, updateData);

    if (!updated) {
      return res.status(400).json({ message: 'Cập nhật thất bại' });
    }

    // Notify clients (especially admin)
    const io = req.app.get('io');
    if (io) {
      io.emit('userUpdated', { userId: userId, action: 'profileUpdate' });
    }

    // Lấy thông tin user mới nhất để trả về
    const user = await User.findUserById(userId);
    const { password, ...userWithoutPassword } = user;

    res.json({ message: 'Cập nhật thành công', user: userWithoutPassword });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
// @desc    Update username
// @route   PUT /api/auth/username
const updateUsername = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username không được để trống' });
    }

    // Kiểm tra username đã tồn tại chưa (loại trừ user hiện tại)
    const existingUser = await User.findUserByUsername(username);
    if (existingUser && !existingUser._id.equals(userId)) {
      return res.status(400).json({ message: 'Username đã được sử dụng' });
    }

    // Cập nhật username
    const updated = await User.updateUserById(userId, { username });
    if (!updated) {
      return res.status(400).json({ message: 'Cập nhật thất bại' });
    }

    // Notify clients
    const io = req.app.get('io');
    if (io) {
      io.emit('userUpdated', { userId: userId, action: 'usernameUpdate' });
    }

    // Lấy thông tin user mới nhất để trả về
    const user = await User.findUserById(userId);
    const { password, ...userWithoutPassword } = user;

    res.json({ message: 'Cập nhật username thành công', user: userWithoutPassword });
  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
    }

    // Lấy user từ DB (có password)
    const user = await User.findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu cũ không đúng' });
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật
    const updated = await User.updateUserById(userId, { password: hashedPassword });
    if (!updated) {
      return res.status(400).json({ message: 'Đổi mật khẩu thất bại' });
    }

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Admin login (separate endpoint for security)
// @route   POST /api/auth/admin-login
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    // Tìm user theo username
    const user = await User.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'locked') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa' });
    }

    // Kiểm tra role admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // Kiểm tra password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Tạo token với role admin
    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await User.recordLogin(user._id);

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: 'Admin login successful',
      token,
      user: { ...userWithoutPassword, role: 'admin' }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Export thêm hai hàm này
module.exports = { register, login, adminLogin, updateProfile, updateUsername, changePassword };