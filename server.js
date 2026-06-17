/* ================================================
   «·Œ«œ„ «·—∆Ì”Ì - SMART MENU CMS
   Node.js + Express.js Server
   ================================================ */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

/* ≈‰‘«¡ «· ÿ»Ìﬁ Ê«·Œ«œ„ */
const app = express();
const server = http.createServer(app);

/* ≈⁄œ«œ Socket.IO ·· ÕœÌÀ«  «·›Ê—Ì… */
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
app.set('io', io);

/* ================================================
   ≈⁄œ«œ «·‹ Middleware
   ================================================ */

/* Õ„«Ì… «·—√” »‹ Helmet */
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

/* CORS - «·”„«Õ »Ã„Ì⁄ «·ÿ·»«  */
app.use(cors({ origin: '*', credentials: true }));

/* „⁄«·Ã… JSON Ê«·‹ Body */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/*  ”ÃÌ· «·ÿ·»«  */
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

/* ================================================
   Rate Limiting - „‰⁄ «·ÂÃ„«  «·„ ﬂ——…
   ================================================ */

/* Õœ ⁄«„: 300 ÿ·» ﬂ· 15 œﬁÌﬁ… */
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: '⁄œœ ÿ·»«  ﬂÀÌ—…. Õ«Ê· »⁄œ ﬁ·Ì·.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

/* Õœ  ”ÃÌ· «·œŒÊ·: 10 „Õ«Ê·«  ﬂ· 15 œﬁÌﬁ… */
app.use(['/api/auth/login', '/api/auth/admin-login'], rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: ' Ã«Ê“  ⁄œœ «·„Õ«Ê·« . «‰ Ÿ— 15 œﬁÌﬁ….' }
}));

/* ================================================
   «·„·›«  «·À«» …
   ================================================ */

/* „Ã·œ «·—›⁄ */
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

/* «·„·›«  «·À«» … ··„‘—Ê⁄ */
app.use(express.static(path.join(__dirname, '..')));

/* ================================================
    ”ÃÌ· «·„”«—«  «·” … «·—∆Ì”Ì…
   ================================================ */

const authRoutes         = require('../routes/auth');
const productsRoutes     = require('../routes/products');
const ordersRoutes       = require('../routes/orders');
const reviewsRoutes      = require('../routes/reviews');
const notificationsRoutes= require('../routes/notifications');
const paymentsRoutes     = require('../routes/payments');

/*  ”ÃÌ· «·„”«—«  */
app.use('/api/auth',          authRoutes);
app.use('/api/products',      productsRoutes);
app.use('/api/orders',        ordersRoutes);
app.use('/api/reviews',       reviewsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payments',      paymentsRoutes);

/* ================================================
   „”«— «·’›Õ… «·—∆Ì”Ì… (SPA)
   ================================================ */

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

/* ================================================
   „⁄«·Ã… «·√Œÿ«¡ «·⁄«„…
   ================================================ */

app.use((err, req, res, next) => {
  console.error('? Œÿ√:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Œÿ√ œ«Œ·Ì ›Ì «·Œ«œ„'
  });
});

/* ================================================
   Socket.IO - «·„” Œœ„Ê‰ «·„ ’·Ê‰
   ================================================ */

let onlineCount = 0;
io.on('connection', (socket) => {
  onlineCount++;
  io.emit('online_users', onlineCount);

  socket.on('join_admin', () => socket.join('admin_room'));

  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    io.emit('online_users', onlineCount);
  });
});

/* ================================================
    ‘€Ì· «·Œ«œ„
   ================================================ */

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('\n?? ====================================');
  console.log('   SMART MENU CMS ó «·Œ«œ„ Ì⁄„· ?');
  console.log(`   http://localhost:${PORT}`);
  console.log('   ·ÊÕ… «· Õﬂ„: «÷€ÿ «·‘⁄«— 7 „—« ');
  console.log('   ID: admin | Pass: Smart@2025');
  console.log('?? ====================================\n');
});

module.exports = { app, io };
