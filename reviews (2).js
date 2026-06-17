/* ================================================
   ãÓÇÑÇÊ ÇáÊÚáíŞÇÊ æÇáÊŞííãÇÊ - routes/reviews.js
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

/* ÅÚÏÇÏ ÑİÚ ÕæÑ ÇáÊÚáíŞÇÊ */
const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'reviews');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `review_${uuidv4()}${ext}`);
  }
});
const uploadReview = multer({ storage: reviewStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('íõÓãÍ İŞØ ÈÑİÚ ÇáÕæÑ'));
}});

/* ================================================
   ÏæÇá ãÓÇÚÏÉ
   ================================================ */

function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'ÛíÑ ãÕÑÍ' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'admin') return res.status(403).json({ success: false, message: 'ÕáÇÍíÇÊ ÛíÑ ßÇİíÉ' });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'ÇáÊæßä ÛíÑ ÕÇáÍ' });
  }
}

function optionalUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}

function updateProductRating(productId) {
  if (!productId) return;
  const result = db.prepare("SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id=? AND status='approved'").get(productId);
  db.prepare('UPDATE products SET rating=?, reviews_count=? WHERE id=?').run(result.avg || 0, result.count || 0, productId);
}

function logActivity(adminId, action, description) {
  try {
    db.prepare('INSERT INTO activity_logs (admin_id, action, description) VALUES (?, ?, ?)').run(adminId || null, action, description);
  } catch {}
}

/* ================================================
   ÌáÈ ÇáÊÚáíŞÇÊ ÇáãŞÈæáÉ (ááãÊÌÑ)
   ================================================ */

router.get('/', (req, res) => {
  const { product_id, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = "WHERE r.status = 'approved'";
  const params = [];
  if (product_id) { where += ' AND r.product_id = ?'; params.push(product_id); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM reviews r ${where}`).get(...params).c;
  const reviews = db.prepare(`
    SELECT r.*, p.name as product_name, p.main_image as product_image,
           GROUP_CONCAT(ri.image, '|') as review_images
    FROM reviews r
    LEFT JOIN products p ON r.product_id = p.id
    LEFT JOIN review_images ri ON r.id = ri.review_id
    ${where} GROUP BY r.id ORDER BY r.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  /* ÊÍæíá ÇáÕæÑ Åáì ãÕİæİÉ */
  const reviewsFormatted = reviews.map(r => ({
    ...r,
    images: r.review_images ? r.review_images.split('|').filter(Boolean) : []
  }));

  /* ãÊæÓØ ÇáÊŞííã */
  const avgRating = product_id
    ? db.prepare("SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id=? AND status='approved'").get(product_id)
    : db.prepare("SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE status='approved'").get();

  res.json({
    success: true,
    reviews: reviewsFormatted,
    total,
    pages: Math.ceil(total / Number(limit)),
    average: (avgRating.avg || 0).toFixed(1),
    count: avgRating.count || 0
  });
});

/* ================================================
   ÅÖÇİÉ ÊÚáíŞ ÌÏíÏ
   ================================================ */

router.post('/', optionalUser, uploadReview.array('images', 5), (req, res) => {
  const { customer_name, customer_city, product_id, rating, review } = req.body;

  if (!customer_name || !review) {
    return res.status(400).json({ success: false, message: 'ÇáÇÓã æÇáÊÚáíŞ ãØáæÈÇä' });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'ÇáÊŞííã íÌÈ Ãä íßæä Èíä 1 æ5' });
  }

  const result = db.prepare(`
    INSERT INTO reviews (user_id, product_id, customer_name, customer_city, rating, review)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    req.user?.id || null,
    product_id || null,
    customer_name,
    customer_city || '',
    Number(rating),
    review
  );

  /* ÍİÙ ÇáÕæÑ */
  if (req.files?.length > 0) {
    req.files.forEach(file => {
      db.prepare('INSERT INTO review_images (review_id, image) VALUES (?, ?)').run(result.lastInsertRowid, `/uploads/reviews/${file.filename}`);
    });
  }

  /* ÅÔÚÇÑ ÇáÃÏãä */
  const io = req.app.get('io');
  if (io) {
    io.to('admin_room').emit('new_review', {
      customer_name,
      rating,
      review: review.substring(0, 50) + '...'
    });
  }

  res.status(201).json({
    success: true,
    message: 'ÔßÑÇğ! ÊÚáíŞß ŞíÏ ÇáãÑÇÌÚÉ æÓíÙåÑ ŞÑíÈÇğ.',
    id: result.lastInsertRowid
  });
});

/* ================================================
   ÅÏÇÑÉ ÇáÊÚáíŞÇÊ - ÇáÃÏãä
   ================================================ */

/* ÌáÈ ÌãíÚ ÇáÊÚáíŞÇÊ */
router.get('/admin/all', verifyAdmin, (req, res) => {
  const { page = 1, limit = 20, status = '', search = '' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = 'WHERE 1=1';
  const params = [];
  if (status) { where += ' AND r.status = ?'; params.push(status); }
  if (search) { where += ' AND (r.customer_name LIKE ? OR r.review LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM reviews r ${where}`).get(...params).c;
  const reviews = db.prepare(`
    SELECT r.*, p.name as product_name,
           GROUP_CONCAT(ri.image, '|') as review_images
    FROM reviews r
    LEFT JOIN products p ON r.product_id = p.id
    LEFT JOIN review_images ri ON r.id = ri.review_id
    ${where} GROUP BY r.id ORDER BY r.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  const reviewsFormatted = reviews.map(r => ({
    ...r,
    images: r.review_images ? r.review_images.split('|').filter(Boolean) : []
  }));

  /* ÅÍÕÇÆíÇÊ */
  const stats = {
    pending:  db.prepare("SELECT COUNT(*) as c FROM reviews WHERE status='pending'").get().c,
    approved: db.prepare("SELECT COUNT(*) as c FROM reviews WHERE status='approved'").get().c,
    rejected: db.prepare("SELECT COUNT(*) as c FROM reviews WHERE status='rejected'").get().c,
    archived: db.prepare("SELECT COUNT(*) as c FROM reviews WHERE status='archived'").get().c,
  };

  res.json({ success: true, reviews: reviewsFormatted, total, pages: Math.ceil(total / Number(limit)), stats });
});

/* ÊÍÏíË ÍÇáÉ ÊÚáíŞ */
router.put('/:id', verifyAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'approved', 'rejected', 'archived'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'ÍÇáÉ ÛíÑ ÕÇáÍÉ' });
  }

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ success: false, message: 'ÇáÊÚáíŞ ÛíÑ ãæÌæÏ' });

  db.prepare('UPDATE reviews SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  /* ÊÍÏíË ÊŞííã ÇáãäÊÌ */
  updateProductRating(review.product_id);

  /* ÅÔÚÇÑ ÇáÚãíá */
  if (review.user_id && (status === 'approved' || status === 'rejected')) {
    const msg = status === 'approved' ? 'Êã ŞÈæá ÊÚáíŞß æäÔÑå ?' : 'áã íÊã ŞÈæá ÊÚáíŞß åĞå ÇáãÑÉ.';
    const io = req.app.get('io');
    if (io) io.emit(`review_update_${review.user_id}`, { status, message: msg });
  }

  logActivity(req.admin.id, `review_${status}`, `${status === 'approved' ? 'ŞÈæá' : 'ÑİÖ'} ÊÚáíŞ #${req.params.id}`);
  res.json({ success: true, message: status === 'approved' ? 'Êã ŞÈæá ÇáÊÚáíŞ' : 'Êã ÊÍÏíË ÇáÊÚáíŞ' });
});

/* ÍĞİ ÊÚáíŞ */
router.delete('/:id', verifyAdmin, (req, res) => {
  const review = db.prepare('SELECT product_id FROM reviews WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  if (review) updateProductRating(review.product_id);
  logActivity(req.admin.id, 'delete_review', `ÍĞİ ÊÚáíŞ #${req.params.id}`);
  res.json({ success: true, message: 'Êã ÍĞİ ÇáÊÚáíŞ' });
});

/* ãæÇİŞÉ ÌãÇÚíÉ */
router.put('/bulk/approve', verifyAdmin, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'ÃÑÓá ŞÇÆãÉ ÇáÜ IDs' });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`UPDATE reviews SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
  /* ÊÍÏíË ÊŞííãÇÊ ÇáãäÊÌÇÊ */
  const reviews = db.prepare(`SELECT DISTINCT product_id FROM reviews WHERE id IN (${placeholders})`).all(...ids);
  reviews.forEach(r => updateProductRating(r.product_id));
  res.json({ success: true, message: `Êã ŞÈæá ${ids.length} ÊÚáíŞ` });
});

module.exports = router;
