const express = require('express');
const Product = require('../models/Product');
const Blog = require('../models/Blog');
const Review = require('../models/Review');

// --- Products ---
const productsRouter = express.Router();
productsRouter.get('/', async (req, res) => {
  try {
    const list = await Product.findAll();
    res.json(list);
  } catch (err) {
    console.error('GET /products', err);
    res.status(500).json({ error: err.message });
  }
});
productsRouter.get('/:id', async (req, res) => {
  try {
    const doc = await Product.findById(req.params.id);
    res.json(doc || {});
  } catch (err) {
    console.error('GET /products/:id', err);
    res.status(500).json({ error: err.message });
  }
});
productsRouter.post('/', async (req, res) => {
  try {
    const body = req.body;
    if (!body.id) body.id = 'p' + Date.now();
    const list = await Product.create(body);
    res.json(list);
  } catch (err) {
    console.error('POST /products', err);
    res.status(500).json({ error: err.message });
  }
});
productsRouter.put('/:id', async (req, res) => {
  try {
    const list = await Product.updateById(req.params.id, req.body);
    if (list === null) return res.status(404).json({ error: 'Not found' });
    res.json(list);
  } catch (err) {
    console.error('PUT /products/:id', err);
    res.status(500).json({ error: err.message });
  }
});
productsRouter.delete('/:id', async (req, res) => {
  try {
    const list = await Product.deleteById(req.params.id);
    res.json(list);
  } catch (err) {
    console.error('DELETE /products/:id', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Blog ---
const blogRouter = express.Router();
blogRouter.get('/', async (req, res) => {
  try {
    const list = await Blog.findAll();
    res.json(list);
  } catch (err) {
    console.error('GET /blog', err);
    res.status(500).json({ error: err.message });
  }
});
blogRouter.get('/:id', async (req, res) => {
  try {
    const doc = await Blog.findById(req.params.id);
    res.json(doc || {});
  } catch (err) {
    console.error('GET /blog/:id', err);
    res.status(500).json({ error: err.message });
  }
});
blogRouter.post('/', async (req, res) => {
  try {
    const body = req.body;
    if (!body.id) body.id = 'blog' + Date.now();
    const list = await Blog.create(body);
    res.json(list);
  } catch (err) {
    console.error('POST /blog', err);
    res.status(500).json({ error: err.message });
  }
});
blogRouter.put('/:id', async (req, res) => {
  try {
    const list = await Blog.updateById(req.params.id, req.body);
    if (list === null) return res.status(404).json({ error: 'Not found' });
    res.json(list);
  } catch (err) {
    console.error('PUT /blog/:id', err);
    res.status(500).json({ error: err.message });
  }
});
blogRouter.delete('/:id', async (req, res) => {
  try {
    const list = await Blog.deleteById(req.params.id);
    res.json(list);
  } catch (err) {
    console.error('DELETE /blog/:id', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Reviews (query productId optional) ---
const reviewsRouter = express.Router();
reviewsRouter.get('/', async (req, res) => {
  try {
    const productId = req.query.productId || null;
    const list = await Review.findAll(productId);
    res.json(list);
  } catch (err) {
    console.error('GET /reviews', err);
    res.status(500).json({ error: err.message });
  }
});
reviewsRouter.get('/:id', async (req, res) => {
  try {
    const doc = await Review.findById(req.params.id);
    res.json(doc || {});
  } catch (err) {
    console.error('GET /reviews/:id', err);
    res.status(500).json({ error: err.message });
  }
});
reviewsRouter.post('/', async (req, res) => {
  try {
    const body = req.body;
    if (!body.id) body.id = 'rev' + Date.now();
    if (body.createdAt == null) body.createdAt = Date.now();
    const list = await Review.create(body);
    res.json(list);
  } catch (err) {
    console.error('POST /reviews', err);
    res.status(500).json({ error: err.message });
  }
});
reviewsRouter.put('/:id', async (req, res) => {
  try {
    const list = await Review.updateById(req.params.id, req.body);
    if (list === null) return res.status(404).json({ error: 'Not found' });
    res.json(list);
  } catch (err) {
    console.error('PUT /reviews/:id', err);
    res.status(500).json({ error: err.message });
  }
});
reviewsRouter.delete('/:id', async (req, res) => {
  try {
    const list = await Review.deleteById(req.params.id);
    res.json(list);
  } catch (err) {
    console.error('DELETE /reviews/:id', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = { productsRouter, blogRouter, reviewsRouter };
