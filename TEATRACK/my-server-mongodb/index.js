const express = require("express");
const app = express();
const port = process.env.PORT || 3002;
const path = require('path');
const fs = require('fs');

const morgan = require("morgan");
app.use(morgan("combined"));

const bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

const cors = require("cors");
app.use(cors());

// Load environment variables (optional but recommended)
require('dotenv').config();

// Tạo thư mục uploads/avatars nếu chưa tồn tại
const uploadDir = path.join(__dirname, 'uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Đã tạo thư mục uploads/avatars');
}
// Phục vụ file tĩnh từ thư mục uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
const { MongoClient, ObjectId } = require("mongodb");
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/TeaTrack";
const client = new MongoClient(mongoUri);

client.connect()
  .then(() => console.log("✅ Kết nối MongoDB thành công!"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

const database = client.db(); // Lấy db từ connection string hoặc mặc định
const UserCollection = database.collection("users");

// Pass database to models
const User = require('./models/User');
User.init(database);
const Otp = require('./models/Otp');
Otp.init(database);
const Product = require('./models/Product');
Product.init(database);
const Blog = require('./models/Blog');
Blog.init(database);
const Review = require('./models/Review');
Review.init(database);
const Order = require('./models/Order');
Order.init(database);
const Cart = require('./models/Cart');
Cart.init(database);
const Contact = require('./models/Contact');
Contact.init(database);
const Promotion = require('./models/Promotion');
Promotion.init(database);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Tạo unique index cho username và email
(async () => {
  try {
    await UserCollection.createIndex({ username: 1 }, { unique: true });
    await UserCollection.createIndex({ email: 1 }, { unique: true });
    // Thêm index cho promotion code
    await database.collection("vouchers").createIndex({ code: 1 }, { unique: true });
    console.log('Unique indexes on username, email and promotion code created');
  } catch (err) {
    console.log('Index creation skipped', err.message);
  }
})();

// Sử dụng auth routes (bao gồm cả forgot-password, verify-otp, reset-password)
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Admin routes (protected)
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// Promotions routes
const promotionRoutes = require('./routes/promotionRoutes');
app.use('/api/promotions', promotionRoutes);

// Products, Blog, Reviews (chuyển từ my-server in-memory sang MongoDB)
const { productsRouter, blogRouter, reviewsRouter } = require('./routes/productsBlogReviewsRoutes');
app.use('/products', productsRouter);
app.use('/blog', blogRouter);
app.use('/reviews', reviewsRouter);

const orderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', orderRoutes);

const cartRoutes = require('./routes/cartRoutes');
app.use('/api/cart', cartRoutes);

const agencyRoutes = require('./routes/agencyRoutes');
agencyRoutes.init(database);
app.use('/api/agencies', agencyRoutes.router);

const contactRoutes = require('./routes/contactRoutes');
app.use('/api/contacts', contactRoutes);


const http = require('http');
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Gắn io vào app để dùng trong routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`My Server with Socket.io listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("This Web server is processed for MongoDB with Real-time Updates");
});