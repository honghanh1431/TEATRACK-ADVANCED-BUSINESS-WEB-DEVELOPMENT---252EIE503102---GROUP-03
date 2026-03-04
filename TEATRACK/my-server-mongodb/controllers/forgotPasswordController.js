const User = require("../models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const getLang = (req) => {
  const lang = (req.body && req.body.lang) || (req.query && req.query.lang) || "";
  // Nếu có lang hợp lệ từ client thì dùng ngay
  if (lang === "vi" || lang === "en") return lang;
  // Fallback dùng Accept-Language nếu không có lang
  const accept = (req.get && req.get("Accept-Language")) || "";
  if (accept.startsWith("en")) return "en";
  return "vi";
};

const messages = {
  vi: {
    emailRequired: "Email là bắt buộc",
    emailNotFound: "Email không tồn tại trong hệ thống",
    otpSent: "OTP đã được gửi đến email của bạn",
    serverError: "Lỗi server",
    missingInfo: "Thiếu thông tin",
    otpInvalidOrExpired: "OTP không tồn tại hoặc đã hết hạn",
    otpExpired: "OTP đã hết hạn",
    otpValid: "OTP hợp lệ",
    requestOtpFirst: "Vui lòng yêu cầu OTP trước",
    otpExpiredRequestAgain: "OTP đã hết hạn, vui lòng yêu cầu lại",
    emailNotFoundShort: "Email không tồn tại",
    passwordUpdated: "Mật khẩu đã được cập nhật",
    emailSubject: "Mã OTP khôi phục mật khẩu - TeaTrack",
    emailTitle: "TeaTrack - Khôi phục mật khẩu",
    emailGreeting: "Chào bạn,",
    emailIntro: "Bạn đã yêu cầu đặt lại mật khẩu. Dưới đây là mã OTP của bạn:",
    emailValidMinutes: "Mã OTP có hiệu lực trong",
    emailMinutes: "10 phút",
    emailDoNotShare: "Vui lòng không chia sẻ mã này với bất kỳ ai.",
    emailIgnore: "Nếu bạn không yêu cầu, hãy bỏ qua email này.",
  },
  en: {
    emailRequired: "Email is required",
    emailNotFound: "Email does not exist in the system",
    otpSent: "OTP has been sent to your email",
    serverError: "Server error",
    missingInfo: "Missing information",
    otpInvalidOrExpired: "OTP does not exist or has expired",
    otpExpired: "OTP has expired",
    otpValid: "OTP is valid",
    requestOtpFirst: "Please request OTP first",
    otpExpiredRequestAgain: "OTP has expired, please request again",
    emailNotFoundShort: "Email not found",
    passwordUpdated: "Password has been updated",
    emailSubject: "Password recovery OTP - TeaTrack",
    emailTitle: "TeaTrack - Password Recovery",
    emailGreeting: "Hello,",
    emailIntro: "You have requested to reset your password. Here is your OTP code:",
    emailValidMinutes: "The OTP is valid for",
    emailMinutes: "10 minutes",
    emailDoNotShare: "Please do not share this code with anyone.",
    emailIgnore: "If you did not request this, please ignore this email.",
  },
};

// Cấu hình gửi email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "teatrack0410@gmail.com",
    // App Password không có khoảng trắng, bạn cần thay bằng đúng app password
    pass: "amchievsrnqwuoed", // loại bỏ khoảng trắng
  },
});

const getEmailHTML = (otp, lang) => {
  const m = messages[lang] || messages.vi;
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        background: #eef5ff;
        margin: 0;
        padding: 24px 20px;
      }

      .container {
        max-width: 520px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 18px;
        box-shadow: 0 10px 30px rgba(0, 136, 255, 0.12);
        overflow: hidden;
        border: 1px solid #0088ff;
      }

      .header {
        background: #0088FF;
        color: #ffffff;
        padding: 32px 24px;
        text-align: center;
      }

      .header h2 {
        margin: 0;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: 1px;
      }

      .content {
        padding: 36px 30px;
        text-align: center;
        background: #ffffff;
      }

      .message {
        color: #4b5563;
        font-size: 16px;
        line-height: 1.7;
        margin-bottom: 18px;
      }

      .otp-code {
        font-size: 44px;
        font-weight: 800;
        letter-spacing: 12px;
        color: #0088FF;
        margin: 28px 0;
        padding: 20px 28px;
        background: #f0f7ff;
        border-radius: 14px;
        display: inline-block;
        border: 2px dashed #0088ff;
      }

      .footer {
        background: #ffffff;
        padding: 22px;
        text-align: center;
        color: #6b7280;
        font-size: 14px;
        line-height: 1.6;
        border-top: 1px solid #0088ff;
      }

      .footer a {
        color: #0088FF;
        text-decoration: none;
        font-weight: 700;
      }

      .footer a:hover {
        text-decoration: underline;
      }

      .brand {
        font-size: 13px;
        color: #9ca3af;
        letter-spacing: 0.5px;
      }

    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>${m.emailTitle}</h2>
      </div>

      <div class="content">
        <div class="message">${m.emailGreeting}</div>
        <div class="message">${m.emailIntro}</div>

        <div class="otp-code">${otp}</div>

        <div class="message">
          ${m.emailValidMinutes} <strong>${m.emailMinutes}</strong>.<br>
          ${m.emailDoNotShare}
        </div>

        <div class="message">${m.emailIgnore}</div>
      </div>

      <div class="footer">
        &copy; 2025 Hồng Trà Ngô Gia<br>
        <a href="http://localhost:4200">hongtrangogia.vn</a>
        <div class="brand">
          Tinh hoa trà Việt - Đậm vị truyền thống
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};

// @desc    Gửi OTP quên mật khẩu
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const lang = getLang(req);
  const m = messages[lang];
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: m.emailRequired });

    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: m.emailNotFound });
    }

    // Tạo OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Hết hạn sau 10 phút

    // Lưu vào MongoDB
    await Otp.saveOtp(email, otp, expiresAt);

    // Gửi email với template HTML (theo lang)
    const mailOptions = {
      from: '"TeaTrack Support" <teatrack0410@gmail.com>',
      to: email,
      subject: m.emailSubject,
      html: getEmailHTML(otp, lang),
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: m.otpSent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: m.serverError });
  }
};

// @desc    Xác thực OTP
// @route   POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  const lang = getLang(req);
  const m = messages[lang];
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: m.missingInfo });

    const record = await Otp.findOtp(email, otp);
    if (!record) {
      return res.status(400).json({ message: m.otpInvalidOrExpired });
    }

    if (new Date() > record.expiresAt) {
      await Otp.deleteOtp(email);
      return res.status(400).json({ message: m.otpExpired });
    }

    res.json({ message: m.otpValid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: m.serverError });
  }
};

// @desc    Đặt lại mật khẩu
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  const lang = getLang(req);
  const m = messages[lang];
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ message: m.missingInfo });

    // Kiểm tra OTP tồn tại (chỉ cần email)
    const record = await Otp.findOtpByEmail(email);
    if (!record) {
      return res.status(400).json({ message: m.requestOtpFirst });
    }

    // Kiểm tra OTP còn hạn không
    if (new Date() > record.expiresAt) {
      await Otp.deleteOtp(email);
      return res.status(400).json({ message: m.otpExpiredRequestAgain });
    }

    const user = await User.findUserByEmail(email);
    if (!user) return res.status(404).json({ message: m.emailNotFoundShort });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(email, hashedPassword);
    await Otp.deleteOtp(email);

    res.json({ message: m.passwordUpdated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: m.serverError });
  }
};

module.exports = { forgotPassword, verifyOtp, resetPassword };
