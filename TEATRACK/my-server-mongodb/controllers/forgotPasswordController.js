const User = require('../models/User');
const Otp = require('../models/Otp');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Cấu hình gửi email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'teatrack0410@gmail.com',
    // App Password không có khoảng trắng, bạn cần thay bằng đúng app password
    pass: 'amchievsrnqwuoed' // loại bỏ khoảng trắng
  }
});

// Tạo template HTML đẹp cho email OTP
const getEmailHTML = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: #0088FF; color: white; padding: 24px; text-align: center; }
        .header h2 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 32px 24px; text-align: center; }
        .otp-code { font-size: 48px; font-weight: 800; letter-spacing: 8px; color: #0088FF; margin: 24px 0; padding: 16px; background: #f0f7ff; border-radius: 12px; display: inline-block; }
        .message { color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
        .footer { background: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
        .footer a { color: #0088FF; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>TeaTrack - Khôi phục mật khẩu</h2>
        </div>
        <div class="content">
          <div class="message">Chào bạn,</div>
          <div class="message">Bạn đã yêu cầu đặt lại mật khẩu. Dưới đây là mã OTP của bạn:</div>
          <div class="otp-code">${otp}</div>
          <div class="message">Mã OTP có hiệu lực trong <strong>10 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</div>
          <div class="message">Nếu bạn không yêu cầu, hãy bỏ qua email này.</div>
        </div>
        <div class="footer">
          &copy; 2025 TeaTrack. All rights reserved.<br>
          <a href="http://localhost:4200">TeaTrack</a>
        </div>
      </div>
    </body>
    </html>
  `;
};

// @desc    Gửi OTP quên mật khẩu
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email là bắt buộc' });

    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
    }

    // Tạo OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Hết hạn sau 10 phút

    // Lưu vào MongoDB
    await Otp.saveOtp(email, otp, expiresAt);

    // Gửi email với template HTML
    const mailOptions = {
      from: '"TeaTrack Support" <teatrack0410@gmail.com>',
      to: email,
      subject: 'Mã OTP khôi phục mật khẩu - TeaTrack',
      html: getEmailHTML(otp)
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP đã được gửi đến email của bạn' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// @desc    Xác thực OTP
// @route   POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Thiếu thông tin' });

    const record = await Otp.findOtp(email, otp);
    if (!record) {
      return res.status(400).json({ message: 'OTP không tồn tại hoặc đã hết hạn' });
    }

    if (new Date() > record.expiresAt) {
      await Otp.deleteOtp(email);
      return res.status(400).json({ message: 'OTP đã hết hạn' });
    }

    res.json({ message: 'OTP hợp lệ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// @desc    Đặt lại mật khẩu
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: 'Thiếu thông tin' });

    // Kiểm tra OTP tồn tại (chỉ cần email)
    const record = await Otp.findOtpByEmail(email);
    if (!record) {
      return res.status(400).json({ message: 'Vui lòng yêu cầu OTP trước' });
    }

    // Kiểm tra OTP còn hạn không
    if (new Date() > record.expiresAt) {
      await Otp.deleteOtp(email);
      return res.status(400).json({ message: 'OTP đã hết hạn, vui lòng yêu cầu lại' });
    }

    const user = await User.findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'Email không tồn tại' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(email, hashedPassword);
    await Otp.deleteOtp(email); // Xóa OTP sau khi dùng

    res.json({ message: 'Mật khẩu đã được cập nhật' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { forgotPassword, verifyOtp, resetPassword };