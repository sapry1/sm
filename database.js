/* ================================================
   ŞÇÚÏÉ ÇáÈíÇäÇÊ - SMART MENU CMS
   äÙÇã: SQLite (íãßä ÇáÊÍæíá áÜ MySQL ÈÓåæáÉ)
   ================================================ */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

/* ãÓÇÑ ãáİ ŞÇÚÏÉ ÇáÈíÇäÇÊ */
const DB_PATH = path.join(__dirname, '..', 'data', 'smartmenu.db');

/* ÅäÔÇÁ ãÌáÏ ÇáÈíÇäÇÊ ÅĞÇ áã íæÌÏ */
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/* ÇáÇÊÕÇá ÈŞÇÚÏÉ ÇáÈíÇäÇÊ */
const db = new Database(DB_PATH);

/* ÊİÚíá ÇáãİÇÊíÍ ÇáÃÌäÈíÉ */
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

/* ================================================
   ÅäÔÇÁ ÇáÌÏÇæá
   ================================================ */
function initializeDatabase() {

  /* ÌÏæá ÇáÅÚÏÇÏÇÊ ÇáÚÇãÉ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_name TEXT DEFAULT 'SMART MENU',
      store_logo TEXT DEFAULT '',
      store_description TEXT DEFAULT 'ÃİÖá ãäíæ ÅáßÊÑæäí ÇÍÊÑÇİí',
      email TEXT DEFAULT 'info@smartmenu.com',
      phone TEXT DEFAULT '+201000000000',
      address TEXT DEFAULT 'ÇáŞÇåÑÉ¡ ãÕÑ',
      whatsapp TEXT DEFAULT '',
      telegram TEXT DEFAULT '',
      facebook TEXT DEFAULT '',
      instagram TEXT DEFAULT '',
      tiktok TEXT DEFAULT '',
      working_hours TEXT DEFAULT '{"sat":{"open":"09:00","close":"23:00","active":true},"sun":{"open":"09:00","close":"23:00","active":true},"mon":{"open":"09:00","close":"23:00","active":true},"tue":{"open":"09:00","close":"23:00","active":true},"wed":{"open":"09:00","close":"23:00","active":true},"thu":{"open":"09:00","close":"23:00","active":true},"fri":{"open":"09:00","close":"23:00","active":true}}',
      default_language TEXT DEFAULT 'ar',
      default_currency TEXT DEFAULT 'EGP',
      minimum_order REAL DEFAULT 0,
      maintenance_mode INTEGER DEFAULT 0,
      maintenance_message TEXT DEFAULT 'äÚÊĞÑ¡ ÇáãÊÌÑ ÊÍÊ ÇáÕíÇäÉ ÍÇáíÇğ.',
      points_per_order INTEGER DEFAULT 10,
      points_value REAL DEFAULT 0.1,
      theme_color TEXT DEFAULT '#FF6B00',
      dark_mode INTEGER DEFAULT 1,
      meta_title TEXT DEFAULT 'SMART MENU - ãäíæ ÅáßÊÑæäí ÇÍÊÑÇİí',
      meta_description TEXT DEFAULT 'ÃİÖá ãäíæ ÅáßÊÑæäí ááãØÇÚã æÇáßÇİíåÇÊ',
      meta_keywords TEXT DEFAULT 'ãäíæ ÅáßÊÑæäí¡ ãØÚã¡ ßÇİíå',
      developer_name TEXT DEFAULT 'Smart Developer',
      developer_whatsapp TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ãÓÊÎÏãí áæÍÉ ÇáÊÍßã (ÇáÃÏãä) */
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT DEFAULT 'ÇáãÏíÑ',
      email TEXT DEFAULT '',
      role TEXT DEFAULT 'owner',
      status TEXT DEFAULT 'active',
      last_login DATETIME,
      failed_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÇáÚãáÇÁ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password TEXT NOT NULL,
      profile_image TEXT DEFAULT '',
      points INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      language TEXT DEFAULT 'ar',
      currency TEXT DEFAULT 'EGP',
      is_verified INTEGER DEFAULT 0,
      reset_code TEXT DEFAULT '',
      reset_expiry DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÇáÃŞÓÇã */
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      name_tr TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      image TEXT DEFAULT '',
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÇáãäÊÌÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      name_tr TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      short_description TEXT DEFAULT '',
      full_description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      old_price REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      main_image TEXT DEFAULT '',
      status TEXT DEFAULT 'available',
      rating REAL DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      orders_count INTEGER DEFAULT 0,
      quantity INTEGER DEFAULT -1,
      minimum_stock INTEGER DEFAULT 5,
      sort_order INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  /* ÌÏæá ÕæÑ ÇáãäÊÌÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  /* ÌÏæá ÇáÚÑæÖ/ÇáÈäÑÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_en TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      button_text TEXT DEFAULT 'ÇØáÈ ÇáÂä',
      button_link TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÇáØáÈÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT DEFAULT '',
      customer_email TEXT DEFAULT '',
      payment_method_id INTEGER,
      payment_proof TEXT DEFAULT '',
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      coupon_code TEXT DEFAULT '',
      total REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      admin_notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
    )
  `);

  /* ÌÏæá ÊİÇÕíá ÇáØáÈÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      product_image TEXT DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);

  /* ÌÏæá ÇáÊÚáíŞÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      product_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_city TEXT DEFAULT '',
      rating INTEGER NOT NULL DEFAULT 5,
      review TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);

  /* ÌÏæá ÕæÑ ÇáÊÚáíŞÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      image TEXT NOT NULL,
      FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
    )
  `);

  /* ÌÏæá ÇáÅÔÚÇÑÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      url TEXT DEFAULT '',
      type TEXT DEFAULT 'text',
      target TEXT DEFAULT 'all',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÅÔÚÇÑÇÊ ÇáãÓÊÎÏãíä */
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  /* ÌÏæá ØÑŞ ÇáÏİÚ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      image TEXT DEFAULT '',
      description TEXT DEFAULT '',
      account_name TEXT DEFAULT '',
      account_number TEXT DEFAULT '',
      instructions TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÇáßæÈæäÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'percentage',
      value REAL NOT NULL DEFAULT 0,
      minimum_order REAL DEFAULT 0,
      usage_limit INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      start_date DATE,
      end_date DATE,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÇáÚãáÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS currencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      code TEXT UNIQUE NOT NULL,
      symbol TEXT NOT NULL,
      exchange_rate REAL DEFAULT 1,
      status TEXT DEFAULT 'active',
      sort_order INTEGER DEFAULT 0
    )
  `);

  /* ÌÏæá ÇááÛÇÊ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS languages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      flag TEXT DEFAULT '',
      direction TEXT DEFAULT 'rtl',
      status TEXT DEFAULT 'active',
      sort_order INTEGER DEFAULT 0
    )
  `);

  /* ÌÏæá ÇáÃÓÆáÉ ÇáÔÇÆÚÉ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÇáÕİÍÇÊ ÇáËÇÈÊÉ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT DEFAULT '',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÇáãİÖáÉ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  /* ÌÏæá ÓÌá ÇáäŞÇØ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS points_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      points INTEGER NOT NULL,
      type TEXT DEFAULT 'earned',
      description TEXT DEFAULT '',
      order_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  /* ÌÏæá ÓÌá ÇáäÔÇØ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      action TEXT NOT NULL,
      description TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÇáäÓÎ ÇáÇÍÊíÇØíÉ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ÌÏæá ÓÌá ÇáãÎÒæä */
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantity_before INTEGER DEFAULT 0,
      quantity_after INTEGER DEFAULT 0,
      action TEXT DEFAULT 'manual',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  /* ÌÏæá ÅÚÇÏÉ ÊÚííä ßáãÉ ÇáãÑæÑ */
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('? Êã ÅäÔÇÁ ÌãíÚ ÇáÌÏÇæá ÈäÌÇÍ');
}

/* ================================================
   ÅÏÑÇÌ ÇáÈíÇäÇÊ ÇáÇİÊÑÇÖíÉ
   ================================================ */
function seedDatabase() {

  /* ÅÏÑÇÌ ÇáÅÚÏÇÏÇÊ ÇáÇİÊÑÇÖíÉ */
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    db.prepare(`INSERT INTO settings DEFAULT VALUES`).run();
    console.log('? Êã ÅäÔÇÁ ÇáÅÚÏÇÏÇÊ ÇáÇİÊÑÇÖíÉ');
  }

  /* ÅäÔÇÁ ÍÓÇÈ ÇáÃÏãä ÇáÇİÊÑÇÖí */
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    const hashedPassword = bcrypt.hashSync('Smart@2025', 12);
    db.prepare(`
      INSERT INTO admins (username, password, full_name, email, role)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, 'ãÏíÑ ÇáäÙÇã', 'admin@smartmenu.com', 'owner');
    console.log('? Êã ÅäÔÇÁ ÍÓÇÈ ÇáÃÏãä - ID: admin | Password: Smart@2025');
  }

  /* ÅÏÑÇÌ ÇáÚãáÇÊ ÇáÇİÊÑÇÖíÉ */
  const currencyCount = db.prepare('SELECT COUNT(*) as count FROM currencies').get();
  if (currencyCount.count === 0) {
    const currencies = [
      { name: 'Ìäíå ãÕÑí', name_en: 'Egyptian Pound', code: 'EGP', symbol: 'Ì.ã', exchange_rate: 1, sort_order: 1 },
      { name: 'ÏæáÇÑ ÃãÑíßí', name_en: 'US Dollar', code: 'USD', symbol: '$', exchange_rate: 0.021, sort_order: 2 },
      { name: 'ÑíÇá ÓÚæÏí', name_en: 'Saudi Riyal', code: 'SAR', symbol: 'Ñ.Ó', exchange_rate: 0.078, sort_order: 3 },
      { name: 'ÏÑåã ÅãÇÑÇÊí', name_en: 'UAE Dirham', code: 'AED', symbol: 'Ï.Å', exchange_rate: 0.077, sort_order: 4 },
      { name: 'áíÑÉ ÊÑßíÉ', name_en: 'Turkish Lira', code: 'TRY', symbol: '?', exchange_rate: 0.67, sort_order: 5 },
      { name: 'ÏíäÇÑ ÃÑÏäí', name_en: 'Jordanian Dinar', code: 'JOD', symbol: 'Ï.Ã', exchange_rate: 0.015, sort_order: 6 },
    ];
    const insertCurrency = db.prepare(`
      INSERT INTO currencies (name, name_en, code, symbol, exchange_rate, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    currencies.forEach(c => insertCurrency.run(c.name, c.name_en, c.code, c.symbol, c.exchange_rate, c.sort_order));
    console.log('? Êã ÅäÔÇÁ ÇáÚãáÇÊ ÇáÇİÊÑÇÖíÉ');
  }

  /* ÅÏÑÇÌ ÇááÛÇÊ ÇáÇİÊÑÇÖíÉ */
  const langCount = db.prepare('SELECT COUNT(*) as count FROM languages').get();
  if (langCount.count === 0) {
    const languages = [
      { name: 'ÇáÚÑÈíÉ', code: 'ar', flag: '????', direction: 'rtl', sort_order: 1 },
      { name: 'English', code: 'en', flag: '????', direction: 'ltr', sort_order: 2 },
      { name: 'Türkçe', code: 'tr', flag: '????', direction: 'ltr', sort_order: 3 },
    ];
    const insertLang = db.prepare(`
      INSERT INTO languages (name, code, flag, direction, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    languages.forEach(l => insertLang.run(l.name, l.code, l.flag, l.direction, l.sort_order));
    console.log('? Êã ÅäÔÇÁ ÇááÛÇÊ ÇáÇİÊÑÇÖíÉ');
  }

  /* ÅÏÑÇÌ ØÑŞ ÇáÏİÚ ÇáÇİÊÑÇÖíÉ */
  const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payment_methods').get();
  if (paymentCount.count === 0) {
    const payments = [
      { name: 'İæÏÇİæä ßÇÔ', name_en: 'Vodafone Cash', description: 'ÇáÏİÚ ÚÈÑ İæÏÇİæä ßÇÔ', account_name: 'ÃÍãÏ ãÍãÏ', account_number: '01000000000', sort_order: 1 },
      { name: 'ÇÊÕÇáÇÊ ßÇÔ', name_en: 'Etisalat Cash', description: 'ÇáÏİÚ ÚÈÑ ÇÊÕÇáÇÊ ßÇÔ', account_name: 'ÃÍãÏ ãÍãÏ', account_number: '01100000000', sort_order: 2 },
      { name: 'ÃæÑäÌ ßÇÔ', name_en: 'Orange Cash', description: 'ÇáÏİÚ ÚÈÑ ÃæÑäÌ ßÇÔ', account_name: 'ÃÍãÏ ãÍãÏ', account_number: '01200000000', sort_order: 3 },
      { name: 'ÅäÓÊÇÈÇí', name_en: 'InstaPay', description: 'ÇáÏİÚ ÚÈÑ ÅäÓÊÇÈÇí', account_name: 'ÃÍãÏ ãÍãÏ', account_number: 'ahmed@instapay', sort_order: 4 },
      { name: 'ÊÍæíá Èäßí', name_en: 'Bank Transfer', description: 'ÊÍæíá Èäßí ãÈÇÔÑ', account_name: 'ÃÍãÏ ãÍãÏ', account_number: '1234567890', sort_order: 5 },
      { name: 'PayPal', name_en: 'PayPal', description: 'ÇáÏİÚ ÚÈÑ PayPal', account_name: 'ahmed@example.com', account_number: 'ahmed@example.com', sort_order: 6 },
    ];
    const insertPayment = db.prepare(`
      INSERT INTO payment_methods (name, name_en, description, account_name, account_number, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    payments.forEach(p => insertPayment.run(p.name, p.name_en, p.description, p.account_name, p.account_number, p.sort_order));
    console.log('? Êã ÅäÔÇÁ ØÑŞ ÇáÏİÚ ÇáÇİÊÑÇÖíÉ');
  }

  /* ÅÏÑÇÌ ÃŞÓÇã ÊÌÑíÈíÉ */
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (catCount.count === 0) {
    const cats = [
      { name: 'ãÔæíÇÊ', slug: 'grills', description: 'ÃÔåì ÇáãÔæíÇÊ ÇáØÇÒÌÉ', sort_order: 1 },
      { name: 'ÔÇæÑãÇ', slug: 'shawarma', description: 'ÔÇæÑãÇ İÇÎÑÉ ÈÃäæÇÚ ãÊÚÏÏÉ', sort_order: 2 },
      { name: 'ÈíÊÒÇ', slug: 'pizza', description: 'ÈíÊÒÇ ØÇÒÌÉ íæãíÇğ', sort_order: 3 },
      { name: 'ÈÑÌÑ', slug: 'burger', description: 'ÈÑÌÑ íÏæí ÈáÍã ØÇÒÌ', sort_order: 4 },
      { name: 'ãŞÈáÇÊ', slug: 'appetizers', description: 'ãŞÈáÇÊ ÔåíÉ', sort_order: 5 },
      { name: 'ãÔÑæÈÇÊ', slug: 'drinks', description: 'ãÔÑæÈÇÊ ØÇÒÌÉ æÈÇÑÏÉ', sort_order: 6 },
      { name: 'ÍáæíÇÊ', slug: 'sweets', description: 'ÃÔåì ÇáÍáæíÇÊ ÇáÔÑŞíÉ æÇáÛÑÈíÉ', sort_order: 7 },
    ];
    const insertCat = db.prepare(`
      INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)
    `);
    cats.forEach(c => insertCat.run(c.name, c.slug, c.description, c.sort_order));
    console.log('? Êã ÅäÔÇÁ ÇáÃŞÓÇã ÇáÇİÊÑÇÖíÉ');
  }

  /* ÅÏÑÇÌ ãäÊÌÇÊ ÊÌÑíÈíÉ */
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (prodCount.count === 0) {
    const products = [
      { category_id: 1, name: 'ãÔÇæí ãÔßáÉ İÇÎÑÉ', slug: 'mixed-grills', short_description: 'ÊÔßíáÉ ãä ÃÔåì ÇáãÔÇæí ÇáØÇÒÌÉ', price: 189, old_price: 220, discount: 14, status: 'available', is_featured: 1, sort_order: 1 },
      { category_id: 2, name: 'ÔÇæÑãÇ ÏÌÇÌ ÓÈíÔá', slug: 'chicken-shawarma', short_description: 'ÔÇæÑãÇ ÏÌÇÌ ÈÕáÕÉ ÎÇÕÉ', price: 45, old_price: 55, discount: 18, status: 'available', is_featured: 1, sort_order: 2 },
      { category_id: 2, name: 'ÔÇæÑãÇ áÍã ßÈíÑ', slug: 'meat-shawarma', short_description: 'ÔÇæÑãÇ áÍã ÈŞÑí ØÇÒÌ', price: 65, old_price: 0, discount: 0, status: 'available', is_featured: 0, sort_order: 3 },
      { category_id: 3, name: 'ÈíÊÒÇ ãÇÑÌÑíÊÇ', slug: 'pizza-margherita', short_description: 'ÈíÊÒÇ ßáÇÓíßíÉ ÈÇáÌÈä æÇáØãÇØã', price: 75, old_price: 90, discount: 17, status: 'available', is_featured: 1, sort_order: 4 },
      { category_id: 4, name: 'ÏÇÈá ÈÑÌÑ ÓÈíÔá', slug: 'double-burger', short_description: 'ÈÑÌÑ ãÒÏæÌ ÈáÍã ØÇÒÌ æÌÈä ÔíÏÑ', price: 89, old_price: 110, discount: 19, status: 'available', is_featured: 1, sort_order: 5 },
      { category_id: 5, name: 'ÍãÕ ÈÇáØÍíäÉ', slug: 'hummus', short_description: 'ÍãÕ ØÇÒÌ ÈÇáØÍíäÉ æÒíÊ ÇáÒíÊæä', price: 25, old_price: 0, discount: 0, status: 'available', is_featured: 0, sort_order: 6 },
      { category_id: 6, name: 'ÚÕíÑ ÈÑÊŞÇá ØÇÒÌ', slug: 'orange-juice', short_description: 'ÚÕíÑ ÈÑÊŞÇá ØÇÒÌ 100%', price: 20, old_price: 0, discount: 0, status: 'available', is_featured: 0, sort_order: 7 },
      { category_id: 7, name: 'ßäÇİÉ ÈÇáŞÔØÉ', slug: 'kunafa', short_description: 'ßäÇİÉ äÇÈáÓíÉ ÈÇáŞÔØÉ ÇáØÇÒÌÉ', price: 35, old_price: 45, discount: 22, status: 'available', is_featured: 1, sort_order: 8 },
      { category_id: 1, name: 'ßÈÇÈ ÍáÈí', slug: 'kabab', short_description: 'ßÈÇÈ áÍã ØÇÒÌ ÈÇáÊæÇÈá ÇáÍáÈíÉ', price: 120, old_price: 0, discount: 0, status: 'available', is_featured: 0, sort_order: 9 },
      { category_id: 3, name: 'ÈíÊÒÇ ÏÌÇÌ', slug: 'chicken-pizza', short_description: 'ÈíÊÒÇ ÈÇáÏÌÇÌ æÇáİáİá Çáãáæä', price: 85, old_price: 0, discount: 0, status: 'out_of_stock', is_featured: 0, sort_order: 10 },
    ];
    const insertProd = db.prepare(`
      INSERT INTO products (category_id, name, slug, short_description, price, old_price, discount, status, is_featured, sort_order, rating, reviews_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    products.forEach(p => insertProd.run(p.category_id, p.name, p.slug, p.short_description, p.price, p.old_price, p.discount, p.status, p.is_featured, p.sort_order, (Math.random() * 2 + 3).toFixed(1), Math.floor(Math.random() * 50)));
    console.log('? Êã ÅäÔÇÁ ÇáãäÊÌÇÊ ÇáÇİÊÑÇÖíÉ');
  }

  /* ÅÏÑÇÌ ÇáÈäÑÇÊ ÇáÇİÊÑÇÖíÉ */
  const bannerCount = db.prepare('SELECT COUNT(*) as count FROM banners').get();
  if (bannerCount.count === 0) {
    const banners = [
      { title: 'ÚÑæÖ ÑãÖÇä ÇáßÑíã ??', description: 'ÎÕæãÇÊ ÊÕá Åáì 30% Úáì ÌãíÚ ÇáãäÊÌÇÊ', button_text: 'ÇØáÈ ÇáÂä', sort_order: 1 },
      { title: 'ÌÏíÏäÇ - ÈÑÌÑ ÓÈíÔá ??', description: 'ÌÑÈ ÃÔåì ÈÑÌÑ íÏæí ÈáÍã ØÇÒÌ', button_text: 'ÇßÊÔİ ÇáÂä', sort_order: 2 },
      { title: 'ãÔÇæí İÇÎÑÉ íæãíÇğ ??', description: 'ÊÔßíáÉ ãä ÃÌæÏ ÇáãÔÇæí ÇáØÇÒÌÉ', button_text: 'ÊÕİÍ Çáãäíæ', sort_order: 3 },
    ];
    const insertBanner = db.prepare(`
      INSERT INTO banners (title, description, button_text, sort_order) VALUES (?, ?, ?, ?)
    `);
    banners.forEach(b => insertBanner.run(b.title, b.description, b.button_text, b.sort_order));
    console.log('? Êã ÅäÔÇÁ ÇáÈäÑÇÊ ÇáÇİÊÑÇÖíÉ');
  }

  /* ÅÏÑÇÌ ÊÚáíŞÇÊ ÊÌÑíÈíÉ */
  const reviewCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
  if (reviewCount.count === 0) {
    const reviews = [
      { customer_name: 'ÃÍãÏ ãÍãÏ', customer_city: 'ÇáŞÇåÑÉ', rating: 5, review: 'Ãßá ÑÇÆÚ ÌÏÇğ æÎÏãÉ ããÊÇÒÉ! ääÕÍ ÇáÌãíÚ ÈÇáÊÌÑÈÉ.', status: 'approved', product_id: 1 },
      { customer_name: 'ÓÇÑÉ ÃÍãÏ', customer_city: 'ÇáÅÓßäÏÑíÉ', rating: 5, review: 'ÇáãÔÇæí ØÇÒÌÉ æÇáãĞÇŞ áÇ íæÕİ. ÓÃÚæÏ ŞÑíÈÇğ ÈÇáÊÃßíÏ!', status: 'approved', product_id: 2 },
      { customer_name: 'ãÍãÏ Úáí', customer_city: 'ÇáÌíÒÉ', rating: 4, review: 'ÊÌÑÈÉ ããÊÇÒÉ¡ ÇáÃßá áĞíĞ æÇáÊæÕíá ÓÑíÚ. ÔßÑÇğ!', status: 'approved', product_id: 3 },
      { customer_name: 'İÇØãÉ ÍÓä', customer_city: 'ÇáÔÇÑŞÉ', rating: 5, review: 'ÃİÖá ÔÇæÑãÇ ÌÑÈÊåÇ İí ÍíÇÊí! ÇáÕáÕÉ ÇáÎÇÕÉ ããíÒÉ ÌÏÇğ.', status: 'approved', product_id: 2 },
      { customer_name: 'ÚãÑ ÎÇáÏ', customer_city: 'ÇáÑíÇÖ', rating: 4, review: 'ÇáÈíÊÒÇ ØÇÒÌÉ æÇáÚÌíäÉ ãËÇáíÉ. ÓÚíÏ ÈÇáÊÌÑÈÉ.', status: 'approved', product_id: 4 },
    ];
    const insertReview = db.prepare(`
      INSERT INTO reviews (customer_name, customer_city, rating, review, status, product_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    reviews.forEach(r => insertReview.run(r.customer_name, r.customer_city, r.rating, r.review, r.status, r.product_id));
    console.log('? Êã ÅäÔÇÁ ÇáÊÚáíŞÇÊ ÇáÇİÊÑÇÖíÉ');
  }

  /* ÅÏÑÇÌ ßæÈæä ÊÌÑíÈí */
  const couponCount = db.prepare('SELECT COUNT(*) as count FROM coupons').get();
  if (couponCount.count === 0) {
    db.prepare(`
      INSERT INTO coupons (code, type, value, minimum_order, usage_limit, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('WELCOME10', 'percentage', 10, 50, 100, 'active');
    db.prepare(`
      INSERT INTO coupons (code, type, value, minimum_order, usage_limit, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('SAVE20', 'percentage', 20, 100, 50, 'active');
    console.log('? Êã ÅäÔÇÁ ÇáßæÈæäÇÊ ÇáÇİÊÑÇÖíÉ');
  }

  /* ÅÏÑÇÌ ÇáÃÓÆáÉ ÇáÔÇÆÚÉ */
  const faqCount = db.prepare('SELECT COUNT(*) as count FROM faq').get();
  if (faqCount.count === 0) {
    const faqs = [
      { question: 'ßíİ íãßääí ÊŞÏíã ØáÈ¿', answer: 'ÃÖİ ÇáãäÊÌÇÊ ááÓáÉ Ëã ÇÖÛØ "ÅÊãÇã ÇáØáÈ" æÇÎÊÑ ØÑíŞÉ ÇáÏİÚ ÇáãäÇÓÈÉ.', category: 'orders', sort_order: 1 },
      { question: 'ãÇ åí ØÑŞ ÇáÏİÚ ÇáãÊÇÍÉ¿', answer: 'äŞÈá ÇáÏİÚ ÚÈÑ İæÏÇİæä ßÇÔ¡ ÅÊÕÇáÇÊ ßÇÔ¡ ÃæÑäÌ ßÇÔ¡ ÅäÓÊÇÈÇí¡ æÊÍæíá Èäßí.', category: 'payments', sort_order: 2 },
      { question: 'ßã ÊÓÊÛÑŞ ãÏÉ ÇáÊæÕíá¿', answer: 'ãÏÉ ÇáÊæÕíá ãä 30 Åáì 60 ÏŞíŞÉ ÍÓÈ ãæŞÚß.', category: 'delivery', sort_order: 3 },
      { question: 'ßíİ ÃÓÊÎÏã ßæÈæä ÇáÎÕã¿', answer: 'ÃÏÎá ßæÏ ÇáßæÈæä İí ÍŞá "ßæÏ ÇáÎÕã" İí ÕİÍÉ ÇáÓáÉ ŞÈá ÅÊãÇã ÇáØáÈ.', category: 'payments', sort_order: 4 },
      { question: 'åá íãßääí ÅáÛÇÁ ÇáØáÈ¿', answer: 'íãßäß ÅáÛÇÁ ÇáØáÈ ÎáÇá 5 ÏŞÇÆŞ ãä ÊŞÏíãå. ÊæÇÕá ãÚäÇ ÚÈÑ æÇÊÓÇÈ áÅáÛÇÁ ÇáØáÈ.', category: 'orders', sort_order: 5 },
      { question: 'ßíİ ÃÊæÇÕá ãÚ ÇáÏÚã Çáİäí¿', answer: 'íãßäß ÇáÊæÇÕá ãÚäÇ ÚÈÑ æÇÊÓÇÈ Ãæ ÇáÇÊÕÇá ÇáãÈÇÔÑ Úáì ÇáÑŞã ÇáãÊÇÍ İí ÇáãæŞÚ.', category: 'support', sort_order: 6 },
    ];
    const insertFaq = db.prepare(`
      INSERT INTO faq (question, answer, category, sort_order) VALUES (?, ?, ?, ?)
    `);
    faqs.forEach(f => insertFaq.run(f.question, f.answer, f.category, f.sort_order));
    console.log('? Êã ÅäÔÇÁ ÇáÃÓÆáÉ ÇáÔÇÆÚÉ');
  }

  /* ÅÏÑÇÌ ÇáÕİÍÇÊ ÇáËÇÈÊÉ */
  const pagesCount = db.prepare('SELECT COUNT(*) as count FROM pages').get();
  if (pagesCount.count === 0) {
    const pages = [
      { title: 'ãä äÍä', slug: 'about', content: '<h2>ãä äÍä</h2><p>äÍä ãØÚã ÇÍÊÑÇİí äŞÏã ÃÔåì ÇáÃßáÇÊ ÇáÔÑŞíÉ æÇáÛÑÈíÉ ÈÃÚáì ãÚÇííÑ ÇáÌæÏÉ æÇáäÙÇİÉ.</p><p>äÓÚì ÏÇÆãÇğ áÊŞÏíã ÊÌÑÈÉ ØÚÇã ÇÓÊËäÇÆíÉ áÚãáÇÆäÇ ÇáßÑÇã.</p>' },
      { title: 'ÓíÇÓÉ ÇáÎÕæÕíÉ', slug: 'privacy', content: '<h2>ÓíÇÓÉ ÇáÎÕæÕíÉ</h2><p>äÍä äáÊÒã ÈÍãÇíÉ ÎÕæÕíÉ ÈíÇäÇÊß ÇáÔÎÕíÉ. ÌãíÚ ÇáãÚáæãÇÊ ÇáÊí ÊÔÇÑßåÇ ãÚäÇ ÊõÓÊÎÏã İŞØ áÊÍÓíä ÎÏãÇÊäÇ.</p>' },
      { title: 'ÇáÔÑæØ æÇáÃÍßÇã', slug: 'terms', content: '<h2>ÇáÔÑæØ æÇáÃÍßÇã</h2><p>ÈÇÓÊÎÏÇã ÎÏãÇÊäÇ¡ İÃäÊ ÊæÇİŞ Úáì åĞå ÇáÔÑæØ æÇáÃÍßÇã. äÍÊİÙ ÈÍŞ ÊÚÏíá åĞå ÇáÔÑæØ İí Ãí æŞÊ.</p>' },
      { title: 'ÇáÏÚã Çáİäí', slug: 'support', content: '<h2>ÇáÏÚã Çáİäí</h2><p>ááÊæÇÕá ãÚ İÑíŞ ÇáÏÚã Çáİäí¡ íãßäß ãÑÇÓáÊäÇ ÚÈÑ æÇÊÓÇÈ Ãæ ÇáÈÑíÏ ÇáÅáßÊÑæäí.</p><p>ÓÇÚÇÊ ÇáÚãá: 9 ÕÈÇÍÇğ - 11 ãÓÇÁğ</p>' },
    ];
    const insertPage = db.prepare(`
      INSERT INTO pages (title, slug, content) VALUES (?, ?, ?)
    `);
    pages.forEach(p => insertPage.run(p.title, p.slug, p.content));
    console.log('? Êã ÅäÔÇÁ ÇáÕİÍÇÊ ÇáÇİÊÑÇÖíÉ');
  }

  console.log('?? Êã ÊåíÆÉ ŞÇÚÏÉ ÇáÈíÇäÇÊ ÈÇáßÇãá');
}

/* ÊÔÛíá ÇáÅÚÏÇÏ */
initializeDatabase();
seedDatabase();

module.exports = db;
