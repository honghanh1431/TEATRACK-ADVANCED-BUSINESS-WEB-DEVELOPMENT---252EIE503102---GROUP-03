const express = require("express");
const app = express();
const port = 3002;
const path = require('path');
const fs = require('fs');

const morgan = require("morgan");
app.use(morgan("combined"));

const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
const client = new MongoClient("mongodb://127.0.0.1:27017");
client.connect();
const database = client.db("TeaTrack");
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
    console.log('Unique indexes on username and email created');
  } catch (err) {
    console.log('Index creation skipped', err.message);
  }
})();

// Sử dụng auth routes (bao gồm cả forgot-password, verify-otp, reset-password)
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Products, Blog, Reviews (chuyển từ my-server in-memory sang MongoDB)
const { productsRouter, blogRouter, reviewsRouter } = require('./routes/productsBlogReviewsRoutes');
app.use('/products', productsRouter);
app.use('/blog', blogRouter);
app.use('/reviews', reviewsRouter);

const orderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', orderRoutes);

const cartRoutes = require('./routes/cartRoutes');
app.use('/api/cart', cartRoutes);

app.listen(port, () => {
  console.log(`My Server listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("This Web server is processed for MongoDB");
});