/* ================================================
   „”«—«  «·≈‘⁄«—«  - routes/notifications.js
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

/* ≈⁄œ«œ —›⁄ ’Ê— «·≈‘⁄«—«  */
const notifStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'notifications');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `notif_${uuidv4()}${path.extname(file.originalname)}`);
  }
});
const uploadNotif = multer({ storage: notifStorage, limits: { fileSize: 5 * 1024 * 1024 } });

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

function logActivity(adminId, action, description) {
  try {
    db.prepare('INSERT INTO activity_logs (admin_id, action, description) VALUES (?, ?, ?)').run(adminId || null, action, description);
  } catch {}
}

/* ================================================
   ≈‘⁄«—«  «·„” Œœ„
   ================================================ */

/* Ã·» «·≈‘⁄«—«  «·⁄«„… (··Ã„Ì⁄) */
router.get('/', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const token = req.headers.authorization?.split(' ')[1];
  let userId = null;
  if (token) {
    try { userId = jwt.verify(token, JWT_SECRET).id; } catch {}
  }

  let notifications;
  let total;

  if (userId) {
    /* „” Œœ„ „”Ã·: ≈‘⁄«—«  ⁄«„… + Œ«’… »Â */
    total = db.prepare(`
      SELECT COUNT(DISTINCT n.id) as c FROM notifications n
      WHERE n.status='active' AND (n.target='all' OR EXISTS (SELECT 1 FROM user_notifications un WHERE un.notification_id=n.id AND un.user_id=?))
    `).get(userId).c;

    notifications = db.prepare(`
      SELECT n.*, COALESCE(un.is_read, 0) as is_read, un.created_at as read_at
      FROM notifications n
      LEFT JOIN user_notifications un ON n.id=un.notification_id AND un.user_id=?
      WHERE n.status='active' AND (n.target='all' OR un.user_id IS NOT NULL)
      ORDER BY n.created_at DESC LIMIT ? OFFSET ?
    `).all(userId, userId, Number(limit), Number(offset));
  } else {
    /* “«∆—: ≈‘⁄«—«  ⁄«„… ›ﬁÿ */
    total = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE status='active' AND target='all'").get().c;
    notifications = db.prepare("SELECT *, 0 as is_read FROM notifications WHERE status='active' AND target='all' ORDER BY created_at DESC LIMIT ? OFFSET ?").all(Number(limit), Number(offset));
  }

  const unread = userId
    ? db.prepare("SELECT COUNT(*) as c FROM user_notifications WHERE user_id=? AND is_read=0").get(userId).c
    : 0;

  res.json({ success: true, notifications, total, unread, pages: Math.ceil(total / Number(limit)) });
});

/*  ÕœÌœ ﬂ„ﬁ—Ê¡ */
router.put('/read/:id', verifyUser, (req, res) => {
  const exists = db.prepare('SELECT id FROM user_notifications WHERE notification_id=? AND user_id=?').get(req.params.id, req.user.id);
  if (exists) {
    db.prepare('UPDATE user_notifications SET is_read=1 WHERE notification_id=? AND user_id=?').run(req.params.id, req.user.id);
  } else {
    db.prepare('INSERT OR IGNORE INTO user_notifications (notification_id, user_id, is_read) VALUES (?, ?, 1)').run(req.params.id, req.user.id);
  }
  res.json({ success: true, message: ' „ «· ÕœÌÀ' });
});

/*  ÕœÌœ «·ﬂ· ﬂ„ﬁ—Ê¡ */
router.put('/read-all', verifyUser, (req, res) => {
  const allNotifs = db.prepare("SELECT id FROM notifications WHERE status='active' AND target='all'").all();
  allNotifs.forEach(n => {
    db.prepare('INSERT OR IGNORE INTO user_notifications (notification_id, user_id, is_read) VALUES (?, ?, 1)').run(n.id, req.user.id);
    db.prepare('UPDATE user_notifications SET is_read=1 WHERE notification_id=? AND user_id=?').run(n.id, req.user.id);
  });
  res.json({ success: true, message: ' „  ÕœÌœ «·ﬂ· ﬂ„ﬁ—Ê¡' });
});

/* ⁄œœ «·≈‘⁄«—«  €Ì— «·„ﬁ—Ê¡… */
router.get('/unread-count', verifyUser, (req, res) => {
  const count = db.prepare("SELECT COUNT(*) as c FROM user_notifications WHERE user_id=? AND is_read=0").get(req.user.id).c;
  const allGeneral = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE status='active' AND target='all'").get().c;
  const readGeneral = db.prepare("SELECT COUNT(*) as c FROM user_notifications WHERE user_id=? AND is_read=1").get(req.user.id).c;
  res.json({ success: true, unread: Math.max(0, allGeneral - readGeneral) + count });
});

/* ================================================
   ≈œ«—… «·≈‘⁄«—«  - «·√œ„‰
   ================================================ */

/* Ã·» Ã„Ì⁄ «·≈‘⁄«—«  */
router.get('/admin/all', verifyAdmin, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const total = db.prepare('SELECT COUNT(*) as c FROM notifications').get().c;
  const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?').all(Number(limit), Number(offset));
  res.json({ success: true, notifications, total, pages: Math.ceil(total / Number(limit)) });
});

/* ≈—”«· ≈‘⁄«— ÃœÌœ */
router.post('/', verifyAdmin, uploadNotif.single('image'), (req, res) => {
  const { title, description, url, type, target, user_ids } = req.body;
  if (!title) return res.status(400).json({ success: false, message: '⁄‰Ê«‰ «·≈‘⁄«— „ÿ·Ê»' });

  const image = req.file ? `/uploads/notifications/${req.file.filename}` : '';
  const notifType = image && description ? 'text_image' : image ? 'image' : 'text';

  const result = db.prepare(`
    INSERT INTO notifications (title, description, image, url, type, target)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, description || '', image, url || '', type || notifType, target || 'all');

  /* ≈—”«· ··„” Œœ„Ì‰ «·„ÕœœÌ‰ */
  if (target === 'specific' && user_ids) {
    const ids = typeof user_ids === 'string' ? JSON.parse(user_ids) : user_ids;
    const insertUserNotif = db.prepare('INSERT OR IGNORE INTO user_notifications (notification_id, user_id) VALUES (?, ?)');
    ids.forEach(uid => insertUserNotif.run(result.lastInsertRowid, uid));
  }

  /* »À «·≈‘⁄«— ⁄»— Socket */
  const io = req.app.get('io');
  if (io) {
    const notifData = { id: result.lastInsertRowid, title, description, image, url, type: type || notifType, created_at: new Date().toISOString() };
    if (target === 'all') {
      io.emit('new_notification', notifData);
    } else if (target === 'specific' && user_ids) {
      const ids = typeof user_ids === 'string' ? JSON.parse(user_ids) : user_ids;
      ids.forEach(uid => io.emit(`notification_${uid}`, notifData));
    }
  }

  logActivity(req.admin.id, 'send_notification', `≈—”«· ≈‘⁄«—: ${title}`);
  res.json({ success: true, id: result.lastInsertRowid, message: ' „ ≈—”«· «·≈‘⁄«—' });
});

/*  ⁄œÌ· ≈‘⁄«— */
router.put('/:id', verifyAdmin, uploadNotif.single('image'), (req, res) => {
  const { title, description, url, status } = req.body;
  const image = req.file ? `/uploads/notifications/${req.file.filename}` : undefined;
  const sets = [];
  const vals = [];
  if (title !== undefined)       { sets.push('title=?');       vals.push(title); }
  if (description !== undefined) { sets.push('description=?'); vals.push(description); }
  if (url !== undefined)         { sets.push('url=?');         vals.push(url); }
  if (status !== undefined)      { sets.push('status=?');      vals.push(status); }
  if (image)                     { sets.push('image=?');       vals.push(image); }
  if (sets.length === 0) return res.status(400).json({ success: false, message: '·«  ÊÃœ »Ì«‰«  ·· ÕœÌÀ' });
  vals.push(req.params.id);
  db.prepare(`UPDATE notifications SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json({ success: true, message: ' „ «· ÕœÌÀ' });
});

/* Õ–› ≈‘⁄«— */
router.delete('/:id', verifyAdmin, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
  logActivity(req.admin.id, 'delete_notification', `Õ–› ≈‘⁄«— #${req.params.id}`);
  res.json({ success: true, message: ' „ «·Õ–›' });
});

module.exports = router;
