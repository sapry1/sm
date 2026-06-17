/* ================================================
   „”«—«  «·„‰ Ã«  Ê«·√ﬁ”«„ Ê«·»‰—«  - routes/products.js
   Ì‘„·: «·„‰ Ã« ° «·√ﬁ”«„° «·»‰—« ° «·„›÷·…° «·»ÕÀ
   ================================================ */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/database');

const JWT_SECRET = process.env.JWT_SECRET || 'smartmenu_secret_key_2025_X9kLmP';

/* ================================================
   ≈⁄œ«œ —›⁄ «·’Ê—
   ================================================ */

function createStorage(folder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', 'uploads', folder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    }
  });
}

const productUpload   = multer({ storage: createStorage('products'),   limits: { fileSize: 5 * 1024 * 1024 } });
const categoryUpload  = multer({ storage: createStorage('categories'), limits: { fileSize: 5 * 1024 * 1024 } });
const bannerUpload    = multer({ storage: createStorage('banners'),    limits: { fileSize: 5 * 1024 * 1024 } });

/* ================================================
   œÊ«· „”«⁄œ…
   ================================================ */

function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: '€Ì— „’—Õ' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'admin') return res.status(403).json({ success: false, message: '’·«ÕÌ«  €Ì— ﬂ«›Ì…' });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: '«· Êﬂ‰ €Ì— ’«·Õ' });
  }
}

function optionalUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}

function verifyUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'ÌÃ»  ”ÃÌ· «·œŒÊ·' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: '«· Êﬂ‰ €Ì— ’«·Õ' });
  }
}

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-') + '-' + Date.now();
}

function logActivity(adminId, action, description) {
  try {
    db.prepare('INSERT INTO activity_logs (admin_id, action, description) VALUES (?, ?, ?)').run(adminId || null, action, description);
  } catch {}
}

/* ================================================
   ﬁ”„: «·√ﬁ”«„ (Categories)
   ================================================ */

/* Ã·» Ã„Ì⁄ «·√ﬁ”«„ „⁄ ⁄œœ «·„‰ Ã«  */
router.get('/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status != 'hidden') as products_count
    FROM categories c WHERE c.status = 'active'
    ORDER BY c.sort_order, c.name
  `).all();
  res.json({ success: true, categories });
});

router.get('/categories/all', verifyAdmin, (req, res) => {
  const categories = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as products_count
    FROM categories c ORDER BY c.sort_order, c.name
  `).all();
  res.json({ success: true, categories });
});

router.get('/categories/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ success: false, message: '«·ﬁ”„ €Ì— „ÊÃÊœ' });
  const products = db.prepare("SELECT * FROM products WHERE category_id = ? AND status != 'hidden' ORDER BY sort_order").all(cat.id);
  res.json({ success: true, category: cat, products });
});

router.post('/categories', verifyAdmin, categoryUpload.single('image'), (req, res) => {
  const { name, name_en, name_tr, description, sort_order } = req.body;
  if (!name) return res.status(400).json({ success: false, message: '«”„ «·ﬁ”„ „ÿ·Ê»' });
  const image = req.file ? `/uploads/categories/${req.file.filename}` : '';
  const slug = slugify(name);
  try {
    const result = db.prepare('INSERT INTO categories (name, name_en, name_tr, slug, image, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, name_en || '', name_tr || '', slug, image, description || '', sort_order || 0);
    logActivity(req.admin.id, 'add_category', `≈÷«›… ﬁ”„: ${name}`);
    res.json({ success: true, id: result.lastInsertRowid, message: ' „ ≈÷«›… «·ﬁ”„' });
  } catch (e) {
    res.status(400).json({ success: false, message: '›‘· ≈÷«›… «·ﬁ”„: ' + e.message });
  }
});

router.put('/categories/:id', verifyAdmin, categoryUpload.single('image'), (req, res) => {
  const { name, name_en, name_tr, description, sort_order, status } = req.body;
  const image = req.file ? `/uploads/categories/${req.file.filename}` : undefined;
  const sets = [];
  const vals = [];
  if (name)        { sets.push('name=?');        vals.push(name); }
  if (name_en !== undefined) { sets.push('name_en=?'); vals.push(name_en); }
  if (name_tr !== undefined) { sets.push('name_tr=?'); vals.push(name_tr); }
  if (description !== undefined) { sets.push('description=?'); vals.push(description); }
  if (sort_order !== undefined) { sets.push('sort_order=?'); vals.push(sort_order); }
  if (status)      { sets.push('status=?');      vals.push(status); }
  if (image)       { sets.push('image=?');       vals.push(image); }
  sets.push('updated_at=CURRENT_TIMESTAMP');
  vals.push(req.params.id);
  db.prepare(`UPDATE categories SET ${sets.join(',')} WHERE id=?`).run(...vals);
  logActivity(req.admin.id, 'update_category', ` ⁄œÌ· ﬁ”„ #${req.params.id}`);
  res.json({ success: true, message: ' „ «· ÕœÌÀ' });
});

router.delete('/categories/:id', verifyAdmin, (req, res) => {
  /* ‰ﬁ· „‰ Ã«  «·ﬁ”„ ·‹ null */
  db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  logActivity(req.admin.id, 'delete_category', `Õ–› ﬁ”„ #${req.params.id}`);
  res.json({ success: true, message: ' „ Õ–› «·ﬁ”„' });
});

/* ================================================
   ﬁ”„: «·„‰ Ã«  (Products)
   ================================================ */

/* Ã·» «·„‰ Ã«  ··„ Ã— */
router.get('/', optionalUser, (req, res) => {
  const { category_id, status = 'available', sort = 'sort_order', page = 1, limit = 20, featured } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = "WHERE p.status != 'hidden'";
  const params = [];
  if (category_id) { where += ' AND p.category_id = ?'; params.push(category_id); }
  if (status && status !== 'all') { where += ' AND p.status = ?'; params.push(status); }
  if (featured === '1') { where += ' AND p.is_featured = 1'; }

  const allowedSorts = { sort_order: 'p.sort_order', price_asc: 'p.price ASC', price_desc: 'p.price DESC', newest: 'p.created_at DESC', popular: 'p.orders_count DESC', rating: 'p.rating DESC' };
  const orderBy = allowedSorts[sort] || 'p.sort_order';

  const total = db.prepare(`SELECT COUNT(*) as c FROM products p ${where}`).get(...params).c;
  const products = db.prepare(`
    SELECT p.*, c.name as category_name, c.id as cat_id
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  /* “Ì«œ… ⁄œœ «·„‘«Âœ«  */
  products.forEach(p => {
    db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(p.id);
  });

  res.json({ success: true, products, total, pages: Math.ceil(total / Number(limit)) });
});

/* Ã·» «·„‰ Ã«  ··√œ„‰ */
router.get('/admin/all', verifyAdmin, (req, res) => {
  const { page = 1, limit = 20, search = '', category_id = '', status = '' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (p.name LIKE ? OR p.short_description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category_id) { where += ' AND p.category_id = ?'; params.push(category_id); }
  if (status) { where += ' AND p.status = ?'; params.push(status); }
  const total = db.prepare(`SELECT COUNT(*) as c FROM products p ${where}`).get(...params).c;
  const products = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));
  res.json({ success: true, products, total, pages: Math.ceil(total / Number(limit)) });
});

/* «·„‰ Ã«  «·√ﬂÀ— ÿ·»« */
router.get('/popular', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'available' ORDER BY p.orders_count DESC, p.rating DESC LIMIT 10
  `).all();
  res.json({ success: true, products });
});

/* „‰ Ã Ê«Õœ */
router.get('/:id', optionalUser, (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: '«·„‰ Ã €Ì— „ÊÃÊœ' });

  /* ’Ê— ≈÷«›Ì… */
  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(product.id);
  /*  ⁄·Ìﬁ«  «·„‰ Ã */
  const reviews = db.prepare("SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 10").all(product.id);

  /*  ÕœÌÀ «·„‘«Âœ«  */
  db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(product.id);

  /* «·„›÷·… ··„” Œœ„ */
  let isFavorite = false;
  if (req.user) {
    const fav = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(req.user.id, product.id);
    isFavorite = !!fav;
  }

  res.json({ success: true, product, images, reviews, is_favorite: isFavorite });
});

/* ≈÷«›… „‰ Ã */
router.post('/', verifyAdmin, productUpload.fields([{ name: 'main_image', maxCount: 1 }, { name: 'images', maxCount: 10 }]), (req, res) => {
  const { name, name_en, name_tr, category_id, short_description, full_description, price, old_price, discount, status, sort_order, is_featured, quantity } = req.body;
  if (!name || !price) return res.status(400).json({ success: false, message: '«”„ «·„‰ Ã Ê«·”⁄— „ÿ·Ê»«‰' });

  const main_image = req.files?.main_image?.[0] ? `/uploads/products/${req.files.main_image[0].filename}` : '';
  const slug = slugify(name);

  try {
    const result = db.prepare(`
      INSERT INTO products (category_id, name, name_en, name_tr, slug, short_description, full_description, price, old_price, discount, main_image, status, sort_order, is_featured, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(category_id || null, name, name_en || '', name_tr || '', slug, short_description || '', full_description || '', price, old_price || 0, discount || 0, main_image, status || 'available', sort_order || 0, is_featured ? 1 : 0, quantity !== undefined ? quantity : -1);

    /* Õ›Ÿ «·’Ê— «·≈÷«›Ì… */
    if (req.files?.images) {
      req.files.images.forEach((file, i) => {
        db.prepare('INSERT INTO product_images (product_id, image, sort_order) VALUES (?, ?, ?)').run(result.lastInsertRowid, `/uploads/products/${file.filename}`, i);
      });
    }

    logActivity(req.admin.id, 'add_product', `≈÷«›… „‰ Ã: ${name}`);
    res.json({ success: true, id: result.lastInsertRowid, message: ' „ ≈÷«›… «·„‰ Ã' });
  } catch (e) {
    res.status(400).json({ success: false, message: '›‘· «·≈÷«›…: ' + e.message });
  }
});

/*  ⁄œÌ· „‰ Ã */
router.put('/:id', verifyAdmin, productUpload.fields([{ name: 'main_image', maxCount: 1 }, { name: 'images', maxCount: 10 }]), (req, res) => {
  const { name, name_en, name_tr, category_id, short_description, full_description, price, old_price, discount, status, sort_order, is_featured, quantity } = req.body;
  const main_image = req.files?.main_image?.[0] ? `/uploads/products/${req.files.main_image[0].filename}` : undefined;

  const sets = [];
  const vals = [];
  const fields = { name, name_en, name_tr, category_id, short_description, full_description, price, old_price, discount, status, sort_order, is_featured, quantity };
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined) { sets.push(`${k}=?`); vals.push(v); }
  });
  if (main_image) { sets.push('main_image=?'); vals.push(main_image); }
  sets.push('updated_at=CURRENT_TIMESTAMP');
  vals.push(req.params.id);

  db.prepare(`UPDATE products SET ${sets.join(',')} WHERE id=?`).run(...vals);

  /* Õ›Ÿ ’Ê— ≈÷«›Ì… */
  if (req.files?.images) {
    req.files.images.forEach((file, i) => {
      const count = db.prepare('SELECT COUNT(*) as c FROM product_images WHERE product_id=?').get(req.params.id).c;
      db.prepare('INSERT INTO product_images (product_id, image, sort_order) VALUES (?, ?, ?)').run(req.params.id, `/uploads/products/${file.filename}`, count + i);
    });
  }

  logActivity(req.admin.id, 'update_product', ` ⁄œÌ· „‰ Ã #${req.params.id}`);
  res.json({ success: true, message: ' „  ÕœÌÀ «·„‰ Ã' });
});

/* Õ–› „‰ Ã */
router.delete('/:id', verifyAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: '«·„‰ Ã €Ì— „ÊÃÊœ' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  logActivity(req.admin.id, 'delete_product', `Õ–› „‰ Ã: ${product.name}`);
  res.json({ success: true, message: ' „ Õ–› «·„‰ Ã' });
});

/* Õ–› ’Ê—… „‰ Ã */
router.delete('/:id/images/:imageId', verifyAdmin, (req, res) => {
  const image = db.prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?').get(req.params.imageId, req.params.id);
  if (!image) return res.status(404).json({ success: false, message: '«·’Ê—… €Ì— „ÊÃÊœ…' });
  const filePath = path.join(__dirname, '..', image.image);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM product_images WHERE id = ?').run(req.params.imageId);
  res.json({ success: true, message: ' „ Õ–› «·’Ê—…' });
});

/* ================================================
   ﬁ”„: «·»‰—«  (Banners)
   ================================================ */

router.get('/banners/list', (req, res) => {
  const banners = db.prepare("SELECT * FROM banners WHERE status='active' ORDER BY sort_order").all();
  res.json({ success: true, banners });
});

router.get('/banners/all', verifyAdmin, (req, res) => {
  const banners = db.prepare('SELECT * FROM banners ORDER BY sort_order').all();
  res.json({ success: true, banners });
});

router.post('/banners', verifyAdmin, bannerUpload.single('image'), (req, res) => {
  const { title, title_en, description, button_text, button_link, sort_order } = req.body;
  if (!title) return res.status(400).json({ success: false, message: '⁄‰Ê«‰ «·»‰— „ÿ·Ê»' });
  const image = req.file ? `/uploads/banners/${req.file.filename}` : '';
  const result = db.prepare('INSERT INTO banners (title, title_en, description, image, button_text, button_link, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(title, title_en || '', description || '', image, button_text || '«ÿ·» «·¬‰', button_link || '', sort_order || 0);
  res.json({ success: true, id: result.lastInsertRowid, message: ' „ ≈÷«›… «·»‰—' });
});

router.put('/banners/:id', verifyAdmin, bannerUpload.single('image'), (req, res) => {
  const { title, title_en, description, button_text, button_link, sort_order, status } = req.body;
  const image = req.file ? `/uploads/banners/${req.file.filename}` : undefined;
  const sets = [];
  const vals = [];
  const fields = { title, title_en, description, button_text, button_link, sort_order, status };
  Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) { sets.push(`${k}=?`); vals.push(v); } });
  if (image) { sets.push('image=?'); vals.push(image); }
  vals.push(req.params.id);
  if (sets.length > 0) db.prepare(`UPDATE banners SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json({ success: true, message: ' „ «· ÕœÌÀ' });
});

router.delete('/banners/:id', verifyAdmin, (req, res) => {
  db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: ' „ «·Õ–›' });
});

/* ================================================
   ﬁ”„: «·»ÕÀ (Search)
   ================================================ */

router.get('/search', (req, res) => {
  const { q = '', limit = 20 } = req.query;
  if (!q.trim()) return res.json({ success: true, results: [], products: [], categories: [] });

  const searchTerm = `%${q}%`;

  const products = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status != 'hidden' AND (p.name LIKE ? OR p.short_description LIKE ? OR p.full_description LIKE ?)
    ORDER BY p.orders_count DESC LIMIT ?
  `).all(searchTerm, searchTerm, searchTerm, Number(limit));

  const categories = db.prepare(`
    SELECT * FROM categories WHERE status='active' AND name LIKE ? LIMIT 5
  `).all(searchTerm);

  res.json({ success: true, products, categories, total: products.length + categories.length });
});

/* ================================================
   ﬁ”„: «·„›÷·… (Favorites)
   ================================================ */

router.get('/favorites/list', verifyUser, (req, res) => {
  const favorites = db.prepare(`
    SELECT p.*, c.name as category_name, f.created_at as favorited_at
    FROM favorites f JOIN products p ON f.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE f.user_id = ? ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json({ success: true, favorites });
});

router.post('/favorites/:productId', verifyUser, (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.productId);
  if (!product) return res.status(404).json({ success: false, message: '«·„‰ Ã €Ì— „ÊÃÊœ' });

  const exists = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(req.user.id, req.params.productId);
  if (exists) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
    return res.json({ success: true, action: 'removed', message: ' „ «·≈“«·… „‰ «·„›÷·…' });
  }

  db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(req.user.id, req.params.productId);
  res.json({ success: true, action: 'added', message: ' „ «·≈÷«›… ··„›÷·…' });
});

router.delete('/favorites/:productId', verifyUser, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  res.json({ success: true, message: ' „ «·Õ–› „‰ «·„›÷·…' });
});

module.exports = router;
