const express = require("express");
const app = express();
const port = 3002;

const morgan = require("morgan");
app.use(morgan("combined"));

const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cors = require("cors");
app.use(cors());

// Load environment variables (optional but recommended)
require('dotenv').config();

// MongoDB connection
const { MongoClient, ObjectId } = require("mongodb");
const client = new MongoClient("mongodb://127.0.0.1:27017");
client.connect();
const database = client.db("TeaTrack");
const UserCollection = database.collection("users");

// Pass database to models
const User = require('./models/User');
User.init(database);   // <-- initialize model with database instance

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

// Use auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`My Server listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("This Web server is processed for MongoDB");
});