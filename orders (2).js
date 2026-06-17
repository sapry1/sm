/* ================================================
   „”«—«  «·ÿ·»«  Ê«·”·… - routes/orders.js
   Ì‘„·: ≈‰‘«¡ «·ÿ·»« ° „ «»⁄ Â«° ≈œ«— Â«
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
   ≈⁄œ«œ —›⁄ ≈À»«  «·œ›⁄
   ================================================ */

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'payments');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `proof_${uuidv4()}${ext}`);
  }
});
const uploadProof = multer({ storage: proofStorage, limits: { fileSize: 10 * 1024 * 1024 } });

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

function generateOrderNumber() {
  const prefix = 'ORD';
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${dateStr}${random}`;
}

function logActivity(adminId, action, description) {
  try {
    db.prepare('INSERT INTO activity_logs (admin_id, action, description) VALUES (?, ?, ?)').run(adminId || null, action, description);
  } catch {}
}

/* ================================================
   ≈‰‘«¡ ÿ·» ÃœÌœ
   ================================================ */

router.post('/', optionalUser, uploadProof.single('payment_proof'), (req, res) => {
  const { customer_name, customer_phone, customer_email, items, payment_method_id, coupon_code, notes, points_used } = req.body;

  if (!customer_name) return res.status(400).json({ success: false, message: '«”„ «·⁄„Ì· „ÿ·Ê»' });
  if (!items) return res.status(400).json({ success: false, message: 'ÌÃ» ≈÷«›… „‰ Ã Ê«Õœ ⁄·Ï «·√ﬁ·' });

  let parsedItems;
  try {
    parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
  } catch {
    return res.status(400).json({ success: false, message: ' ‰”Ìﬁ «·„‰ Ã«  €Ì— ’ÕÌÕ' });
  }

  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    return res.status(400).json({ success: false, message: '·«  ÊÃœ „‰ Ã«  ›Ì «·ÿ·»' });
  }

  /* «· Õﬁﬁ „‰ «·Õœ «·√œ‰Ï */
  const settings = db.prepare('SELECT minimum_order, maintenance_mode FROM settings WHERE id = 1').get();
  if (settings.maintenance_mode) {
    return res.status(503).json({ success: false, message: '«·„ Ã— „€·ﬁ Õ«·Ì« ··’Ì«‰…' });
  }

  /* Õ”«» «·≈Ã„«·Ì */
  let subtotal = 0;
  const orderItems = [];

  for (const item of parsedItems) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
    if (!product) return res.status(400).json({ success: false, message: `«·„‰ Ã #${item.product_id} €Ì— „ÊÃÊœ` });
    if (product.status === 'out_of_stock') return res.status(400).json({ success: false, message: `${product.name} €Ì— „ Ê›— Õ«·Ì«` });
    if (product.status === 'hidden') return res.status(400).json({ success: false, message: '√Õœ «·„‰ Ã«  €Ì— „ «Õ' });

    const qty = Number(item.quantity) || 1;
    const itemTotal = product.price * qty;
    subtotal += itemTotal;

    orderItems.push({
      product_id: product.id,
      product_name: product.name,
      product_image: product.main_image,
      quantity: qty,
      price: product.price,
      total: itemTotal
    });
  }

  /* «· Õﬁﬁ „‰ «·Õœ «·√œ‰Ï */
  if (settings.minimum_order > 0 && subtotal < settings.minimum_order) {
    return res.status(400).json({ success: false, message: `«·Õœ «·√œ‰Ï ··ÿ·» ${settings.minimum_order} Ã‰ÌÂ` });
  }

  /*  ÿ»Ìﬁ «·ﬂÊ»Ê‰ */
  let discount = 0;
  let validCoupon = null;
  if (coupon_code) {
    validCoupon = db.prepare("SELECT * FROM coupons WHERE code=? AND status='active'").get(coupon_code.toUpperCase());
    if (validCoupon) {
      if (validCoupon.type === 'percentage') discount = (subtotal * validCoupon.value) / 100;
      else if (validCoupon.type === 'fixed') discount = validCoupon.value;
      discount = Math.min(discount, subtotal);
    }
  }

  /*  ÿ»Ìﬁ «·‰ﬁ«ÿ */
  let pointsDiscount = 0;
  if (points_used && req.user) {
    const pointsSettings = db.prepare('SELECT points_value FROM settings WHERE id = 1').get();
    const userPoints = db.prepare('SELECT points FROM users WHERE id = ?').get(req.user.id)?.points || 0;
    const usedPoints = Math.min(Number(points_used), userPoints);
    pointsDiscount = usedPoints * (pointsSettings.points_value || 0.1);
    pointsDiscount = Math.min(pointsDiscount, subtotal - discount);
  }

  const total = Math.max(0, subtotal - discount - pointsDiscount);
  const payment_proof = req.file ? `/uploads/payments/${req.file.filename}` : '';
  const order_number = generateOrderNumber();

  /* ≈‰‘«¡ «·ÿ·» */
  const orderResult = db.prepare(`
    INSERT INTO orders (order_number, user_id, customer_name, customer_phone, customer_email, payment_method_id, payment_proof, subtotal, discount, coupon_code, total, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order_number,
    req.user?.id || null,
    customer_name,
    customer_phone || '',
    customer_email || '',
    payment_method_id || null,
    payment_proof,
    subtotal,
    discount + pointsDiscount,
    coupon_code || '',
    total,
    notes || ''
  );

  /* ≈÷«›…  ›«’Ì· «·ÿ·» */
  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?, ?)');
  orderItems.forEach(item => {
    insertItem.run(orderResult.lastInsertRowid, item.product_id, item.product_name, item.product_image, item.quantity, item.price, item.total);
    /*  ÕœÌÀ ⁄œœ «·ÿ·»«  */
    db.prepare('UPDATE products SET orders_count = orders_count + ? WHERE id = ?').run(item.quantity, item.product_id);
  });

  /*  ÕœÌÀ «·ﬂÊ»Ê‰ */
  if (validCoupon) {
    db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(validCoupon.id);
  }

  /*  ÕœÌÀ «·‰ﬁ«ÿ */
  if (req.user) {
    /* ‰ﬁ«ÿ «·„ﬂ ”»… */
    const pointsSettings = db.prepare('SELECT points_per_order FROM settings WHERE id = 1').get();
    const earnedPoints = Math.floor(total / 100 * (pointsSettings.points_per_order || 10));

    /* Œ’„ «·‰ﬁ«ÿ «·„” Œœ„… */
    const usedPoints = points_used ? Math.min(Number(points_used), db.prepare('SELECT points FROM users WHERE id = ?').get(req.user.id)?.points || 0) : 0;

    db.prepare('UPDATE users SET points = points + ? - ? WHERE id = ?').run(earnedPoints, usedPoints, req.user.id);

    if (earnedPoints > 0) {
      db.prepare('INSERT INTO points_history (user_id, points, type, description, order_id) VALUES (?, ?, ?, ?, ?)').run(req.user.id, earnedPoints, 'earned', `‰ﬁ«ÿ ÿ·» ${order_number}`, orderResult.lastInsertRowid);
    }
    if (usedPoints > 0) {
      db.prepare('INSERT INTO points_history (user_id, points, type, description, order_id) VALUES (?, ?, ?, ?, ?)').run(req.user.id, -usedPoints, 'used', `«” Œœ«„ ‰ﬁ«ÿ ›Ì ${order_number}`, orderResult.lastInsertRowid);
    }
  }

  /* ≈‘⁄«— «·√œ„‰ ⁄»— Socket */
  const io = req.app.get('io');
  if (io) {
    io.to('admin_room').emit('new_order', {
      order_number,
      customer_name,
      total,
      created_at: new Date().toISOString()
    });
  }

  res.status(201).json({
    success: true,
    message: ' „ ≈—”«· ÿ·»ﬂ »‰Ã«Õ!',
    order_number,
    order_id: orderResult.lastInsertRowid,
    total
  });
});

/* ================================================
   Ã·» ÿ·»«  «·„” Œœ„ «·Õ«·Ì
   ================================================ */

router.get('/my-orders', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'ÌÃ»  ”ÃÌ· «·œŒÊ·' });

  let userId;
  try {
    userId = jwt.verify(token, JWT_SECRET).id;
  } catch {
    return res.status(401).json({ success: false, message: '«· Êﬂ‰ €Ì— ’«·Õ' });
  }

  const orders = db.prepare(`
    SELECT o.*, pm.name as payment_name
    FROM orders o LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    WHERE o.user_id = ? ORDER BY o.created_at DESC
  `).all(userId);

  /* ≈÷«›…  ›«’Ì· ·ﬂ· ÿ·» */
  const ordersWithItems = orders.map(order => ({
    ...order,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
  }));

  res.json({ success: true, orders: ordersWithItems });
});

/*  ›«’Ì· ÿ·» „Õœœ */
router.get('/my-orders/:orderNumber', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let userId = null;
  if (token) {
    try { userId = jwt.verify(token, JWT_SECRET).id; } catch {}
  }

  const order = db.prepare(`
    SELECT o.*, pm.name as payment_name, pm.account_name, pm.account_number
    FROM orders o LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    WHERE o.order_number = ?
  `).get(req.params.orderNumber);

  if (!order) return res.status(404).json({ success: false, message: '«·ÿ·» €Ì— „ÊÃÊœ' });
  if (userId && order.user_id && order.user_id !== userId) {
    return res.status(403).json({ success: false, message: '€Ì— „’—Õ »«·Ê’Ê·' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ success: true, order: { ...order, items } });
});

/* ================================================
   ≈œ«—… «·ÿ·»«  - «·√œ„‰
   ================================================ */

/* Ã·» Ã„Ì⁄ «·ÿ·»«  */
router.get('/', verifyAdmin, (req, res) => {
  const { page = 1, limit = 20, status = '', search = '', date = '' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = 'WHERE 1=1';
  const params = [];
  if (status) { where += ' AND o.status = ?'; params.push(status); }
  if (search) { where += ' AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (date) { where += ' AND date(o.created_at) = ?'; params.push(date); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM orders o ${where}`).get(...params).c;
  const orders = db.prepare(`
    SELECT o.*, pm.name as payment_name
    FROM orders o LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  res.json({ success: true, orders, total, pages: Math.ceil(total / Number(limit)) });
});

/*  ›«’Ì· ÿ·» */
router.get('/:id', verifyAdmin, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, pm.name as payment_name, pm.account_name, pm.account_number, pm.instructions,
           u.full_name as user_name, u.email as user_email, u.phone as user_phone
    FROM orders o
    LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ success: false, message: '«·ÿ·» €Ì— „ÊÃÊœ' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ success: true, order: { ...order, items } });
});

/*  ÕœÌÀ Õ«·… «·ÿ·» */
router.put('/:id', verifyAdmin, (req, res) => {
  const { status, admin_notes } = req.body;
  const validStatuses = ['pending', 'processing', 'ready', 'completed', 'rejected', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Õ«·… «·ÿ·» €Ì— ’«·Õ…' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: '«·ÿ·» €Ì— „ÊÃÊœ' });

  db.prepare('UPDATE orders SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, admin_notes, req.params.id);

  /* ≈‘⁄«— «·⁄„Ì· ⁄»— Socket */
  const io = req.app.get('io');
  if (io && order.user_id) {
    const statusMessages = {
      processing: 'Ã«—Ì  ÃÂÌ“ ÿ·»ﬂ ???',
      ready: 'ÿ·»ﬂ Ã«Â“! ?',
      completed: ' „ «ﬂ „«· ÿ·»ﬂ »‰Ã«Õ ??',
      rejected: ' „ —›÷ ÿ·»ﬂ.  Ê«’· „⁄‰«.',
      cancelled: ' „ ≈·€«¡ ÿ·»ﬂ.'
    };
    if (status && statusMessages[status]) {
      io.emit(`order_update_${order.user_id}`, {
        order_number: order.order_number,
        status,
        message: statusMessages[status]
      });

      /* ≈‰‘«¡ ≈‘⁄«— */
      if (statusMessages[status]) {
        const notif = db.prepare('INSERT INTO notifications (title, description, type, target) VALUES (?, ?, ?, ?)').run(
          ` ÕœÌÀ ÿ·» ${order.order_number}`,
          statusMessages[status],
          'text',
          'specific'
        );
        db.prepare('INSERT INTO user_notifications (notification_id, user_id) VALUES (?, ?)').run(notif.lastInsertRowid, order.user_id);
      }
    }
  }

  logActivity(req.admin.id, 'update_order', ` ÕœÌÀ ÿ·» #${req.params.id} ≈·Ï ${status}`);
  res.json({ success: true, message: ' „  ÕœÌÀ «·ÿ·»' });
});

/* Õ–› ÿ·» */
router.delete('/:id', verifyAdmin, (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  logActivity(req.admin.id, 'delete_order', `Õ–› ÿ·» #${req.params.id}`);
  res.json({ success: true, message: ' „ Õ–› «·ÿ·»' });
});

module.exports = router;
