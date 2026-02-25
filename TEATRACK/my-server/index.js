const express = require("express");
const app = express();
const port = 3100;
const morgan = require("morgan");
const cors = require("cors");

app.use(morgan("combined"));
app.use(cors());
app.use(express.json());

// --- Dữ liệu in-memory (dùng cho admin / app sau này) ---
const BookInfo = [];
const Products = [];
const Blog = [];
const Reviews = [];

// --- Default API ---
app.get("/", (req, res) => {
  res.send("Xin chào quý khách!");
});

// --- BookInfo (giữ tương thích cũ) ---
app.get("/bookinfo", (req, res) => {
  res.send(BookInfo);
});
app.get("/bookinfo/:id", (req, res) => {
  const id = req.params.id;
  const p = BookInfo.find((x) => x.BookId === id);
  res.send(p || {});
});
app.post("/bookinfo", (req, res) => {
  const body = req.body;
  if (!body.BookId) body.BookId = "info" + (BookInfo.length + 1);
  BookInfo.push(body);
  res.send(BookInfo);
});
app.put("/bookinfo", (req, res) => {
  const book = BookInfo.find((x) => x.BookId === req.body.BookId);
  if (book) Object.assign(book, req.body);
  res.send(BookInfo);
});
app.delete("/bookinfo/:id", (req, res) => {
  const id = req.params.id;
  const idx = BookInfo.findIndex((x) => x.BookId === id);
  if (idx >= 0) BookInfo.splice(idx, 1);
  res.send(BookInfo);
});

// --- Products (sản phẩm, dành cho admin) ---
app.get("/products", (req, res) => {
  res.send(Products);
});
app.get("/products/:id", (req, res) => {
  const id = req.params.id;
  const p = Products.find((x) => String(x.id) === id);
  res.send(p || {});
});
app.post("/products", (req, res) => {
  const body = req.body;
  if (!body.id) body.id = "p" + (Products.length + 1);
  Products.push(body);
  res.send(Products);
});
app.put("/products/:id", (req, res) => {
  const id = req.params.id;
  const p = Products.find((x) => String(x.id) === id);
  if (p) Object.assign(p, req.body);
  res.send(Products);
});
app.delete("/products/:id", (req, res) => {
  const id = req.params.id;
  const idx = Products.findIndex((x) => String(x.id) === id);
  if (idx >= 0) Products.splice(idx, 1);
  res.send(Products);
});

// --- Blog ---
app.get("/blog", (req, res) => {
  res.send(Blog);
});
app.get("/blog/:id", (req, res) => {
  const id = req.params.id;
  const b = Blog.find((x) => String(x.id) === id);
  res.send(b || {});
});
app.post("/blog", (req, res) => {
  const body = req.body;
  if (!body.id) body.id = "blog" + (Blog.length + 1);
  Blog.push(body);
  res.send(Blog);
});
app.put("/blog/:id", (req, res) => {
  const id = req.params.id;
  const b = Blog.find((x) => String(x.id) === id);
  if (b) Object.assign(b, req.body);
  res.send(Blog);
});
app.delete("/blog/:id", (req, res) => {
  const id = req.params.id;
  const idx = Blog.findIndex((x) => String(x.id) === id);
  if (idx >= 0) Blog.splice(idx, 1);
  res.send(Blog);
});

// --- Reviews / Comment đánh giá (theo productId) ---
app.get("/reviews", (req, res) => {
  const productId = req.query.productId;
  let list = Reviews;
  if (productId) {
    list = Reviews.filter((x) => String(x.productId) === String(productId));
  }
  list = [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.send(list);
});
app.get("/reviews/:id", (req, res) => {
  const id = req.params.id;
  const r = Reviews.find((x) => String(x.id) === id);
  res.send(r || {});
});
app.post("/reviews", (req, res) => {
  const body = req.body;
  if (!body.id) body.id = "rev" + Date.now();
  if (body.createdAt == null) body.createdAt = Date.now();
  Reviews.push(body);
  res.send(Reviews);
});
app.put("/reviews/:id", (req, res) => {
  const id = req.params.id;
  const r = Reviews.find((x) => String(x.id) === id);
  if (r) Object.assign(r, req.body);
  res.send(Reviews);
});
app.delete("/reviews/:id", (req, res) => {
  const id = req.params.id;
  const idx = Reviews.findIndex((x) => String(x.id) === id);
  if (idx >= 0) Reviews.splice(idx, 1);
  res.send(Reviews);
});

app.listen(port, () => {
  console.log(`My server is starting at port = ${port}`);
});
