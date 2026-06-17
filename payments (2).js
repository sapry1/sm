/* ================================================
   ãÓÇÑÇÊ ÇáÏÝÚ æØÑÞ ÇáÏÝÚ - routes/payments.js
   íÔãá: ØÑÞ ÇáÏÝÚ¡ ÅËÈÇÊ ÇáÏÝÚ¡ ÇáÚãáíÇÊ ÇáãÇáíÉ
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

/* ÅÚÏÇÏ ÑÝÚ ÕæÑ ØÑÞ ÇáÏÝÚ */
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'payments');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `payment_${uuidv4()}${path.extname(file.originalname)}`);
  }
});
const uploadPayment = multer({ storage: paymentStorage, limits: { fileSize: 5 * 1024 * 1024 } });

/* ================================================
   ÏæÇá ãÓÇÚÏÉ
   ================================================ */

function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'ÛíÑ ãÕÑÍ' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'admin') return res.status(403).json({ success: false, message: 'ÕáÇÍíÇÊ ÛíÑ ßÇÝíÉ' });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'ÇáÊæßä ÛíÑ ÕÇáÍ' });
  }
}

function logActivity(adminId, action, description) {
  try {
    db.prepare('INSERT INTO activity_logs (admin_id, action, description) VALUES (?, ?, ?)').run(adminId || null, action, description);
  } catch {}
}

/* ================================================
   ØÑÞ ÇáÏÝÚ (ááãÊÌÑ - ÚÇãÉ)
   ================================================ */

/* ÌáÈ ØÑÞ ÇáÏÝÚ ÇáãÝÚøáÉ */
router.get('/', (req, res) => {
  const methods = db.prepare(`
    SELECT id, name, name_en, image, description, account_name, account_number, instructions, sort_order
    FROM payment_methods WHERE status='active' ORDER BY sort_order, name
  `).all();
  res.json({ success: true, payment_methods: methods });
});

/* ÊÝÇÕíá ØÑíÞÉ ÏÝÚ */
router.get('/:id', (req, res) => {
  const method = db.prepare(`
    SELECT id, name, name_en, image, description, account_name, account_number, instructions
    FROM payment_methods WHERE id=? AND status='active'
  `).get(req.params.id);
  if (!method) return res.status(404).json({ success: false, message: 'ØÑíÞÉ ÇáÏÝÚ ÛíÑ ãæÌæÏÉ' });
  res.json({ success: true, method });
});

/* ================================================
   ÅÏÇÑÉ ØÑÞ ÇáÏÝÚ - ÇáÃÏãä
   ================================================ */

/* ÌáÈ ÌãíÚ ØÑÞ ÇáÏÝÚ */
router.get('/admin/all', verifyAdmin, (req, res) => {
  const methods = db.prepare('SELECT * FROM payment_methods ORDER BY sort_order, name').all();
  res.json({ success: true, payment_methods: methods });
});

/* ÅÖÇÝÉ ØÑíÞÉ ÏÝÚ */
router.post('/admin/add', verifyAdmin, uploadPayment.single('image'), (req, res) => {
  const { name, name_en, description, account_name, account_number, instructions, sort_order } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'ÇÓã ØÑíÞÉ ÇáÏÝÚ ãØáæÈ' });
  const image = req.file ? `/uploads/payments/${req.file.filename}` : '';
  const result = db.prepare(`
    INSERT INTO payment_methods (name, name_en, image, description, account_name, account_number, instructions, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, name_en || '', image, description || '', account_name || '', account_number || '', instructions || '', sort_order || 0);
  logActivity(req.admin.id, 'add_payment_method', `ÅÖÇÝÉ ØÑíÞÉ ÏÝÚ: ${name}`);
  res.json({ success: true, id: result.lastInsertRowid, message: 'Êã ÇáÅÖÇÝÉ' });
});

/* ÊÚÏíá ØÑíÞÉ ÏÝÚ */
router.put('/admin/:id', verifyAdmin, uploadPayment.single('image'), (req, res) => {
  const { name, name_en, description, account_name, account_number, instructions, sort_order, status } = req.body;
  const image = req.file ? `/uploads/payments/${req.file.filename}` : undefined;
  const sets = [];
  const vals = [];
  const fields = { name, name_en, description, account_name, account_number, instructions, sort_order, status };
  Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) { sets.push(`${k}=?`); vals.push(v); } });
  if (image) { sets.push('image=?'); vals.push(image); }
  if (sets.length === 0) return res.status(400).json({ success: false, message: 'áÇ ÊæÌÏ ÈíÇäÇÊ' });
  vals.push(req.params.id);
  db.prepare(`UPDATE payment_methods SET ${sets.join(',')} WHERE id=?`).run(...vals);
  logActivity(req.admin.id, 'update_payment_method', `ÊÚÏíá ØÑíÞÉ ÏÝÚ #${req.params.id}`);
  res.json({ success: true, message: 'Êã ÇáÊÍÏíË' });
});

/* ÊÝÚíá / ÊÚØíá ØÑíÞÉ ÏÝÚ */
router.patch('/admin/:id/toggle', verifyAdmin, (req, res) => {
  const method = db.prepare('SELECT status FROM payment_methods WHERE id=?').get(req.params.id);
  if (!method) return res.status(404).json({ success: false, message: 'ÛíÑ ãæÌæÏ' });
  const newStatus = method.status === 'active' ? 'inactive' : 'active';
  db.prepare('UPDATE payment_methods SET status=? WHERE id=?').run(newStatus, req.params.id);
  res.json({ success: true, status: newStatus, message: `Êã ${newStatus === 'active' ? 'ÇáÊÝÚíá' : 'ÇáÊÚØíá'}` });
});

/* ÍÐÝ ØÑíÞÉ ÏÝÚ */
router.delete('/admin/:id', verifyAdmin, (req, res) => {
  db.prepare('DELETE FROM payment_methods WHERE id=?').run(req.params.id);
  logActivity(req.admin.id, 'delete_payment_method', `ÍÐÝ ØÑíÞÉ ÏÝÚ #${req.params.id}`);
  res.json({ success: true, message: 'Êã ÇáÍÐÝ' });
});

/* ================================================
   ÑÝÚ ÅËÈÇÊ ÇáÏÝÚ
   ================================================ */

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'proofs');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `proof_${uuidv4()}${path.extname(file.originalname)}`);
  }
});
const uploadProof = multer({ storage: proofStorage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/proof/:orderId', uploadProof.single('proof'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'áã íÊã ÑÝÚ ãáÝ' });
  const proofUrl = `/uploads/proofs/${req.file.filename}`;
  db.prepare('UPDATE orders SET payment_proof=? WHERE id=?').run(proofUrl, req.params.orderId);

  /* ÅÔÚÇÑ ÇáÃÏãä */
  const io = req.app.get('io');
  if (io) io.to('admin_room').emit('payment_proof', { order_id: req.params.orderId, proof: proofUrl });

  res.json({ success: true, message: 'Êã ÑÝÚ ÅËÈÇÊ ÇáÏÝÚ ÈäÌÇÍ', proof_url: proofUrl });
});

/* ================================================
   ÅÍÕÇÆíÇÊ ÇáÏÝÚ - ÇáÃÏãä
   ================================================ */

router.get('/admin/stats/overview', verifyAdmin, (req, res) => {
  const stats = {
    total_revenue:     db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE status='completed'").get().r,
    pending_payments:  db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='pending' AND payment_proof != ''").get().c,
    today_revenue:     db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE date(created_at)=date('now') AND status='completed'").get().r,
    month_revenue:     db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now') AND status='completed'").get().r,
    by_method: db.prepare(`
      SELECT pm.name, COUNT(o.id) as count, COALESCE(SUM(o.total),0) as revenue
      FROM orders o JOIN payment_methods pm ON o.payment_method_id=pm.id
      WHERE o.status='completed' GROUP BY o.payment_method_id
    `).all(),
  };
  res.json({ success: true, stats });
});

/* ØáÈÇÊ ãÚ ÅËÈÇÊ ÏÝÚ */
router.get('/admin/pending-proofs', verifyAdmin, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, pm.name as payment_name
    FROM orders o LEFT JOIN payment_methods pm ON o.payment_method_id=pm.id
    WHERE o.payment_proof != '' AND o.status='pending'
    ORDER BY o.created_at DESC
  `).all();
  res.json({ success: true, orders });
});

module.exports = router;
