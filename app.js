/* ================================================
   app.js - «·„·› «·—∆Ì”Ì ·· ÿ»Ìﬁ
   SMART MENU CMS
   Ì‘„·: «· ÂÌ∆…° Socket.IO° «·‰Ÿ«„ «·⁄«„°
   «Œ ’«— ·ÊÕ… «· Õﬂ„ (7 ‰ﬁ—« )
   ================================================ */

/* ==================== ≈⁄œ«œ«  ⁄«„… ==================== */
const API_BASE = '/api';
const ADMIN_CLICKS_REQUIRED = 7;
const CLICK_RESET_TIMEOUT = 5000; /* 5 ÀÊ«‰Ì */

/* Õ«·… «· ÿ»Ìﬁ */
const AppState = {
  token: localStorage.getItem('user_token') || null,
  adminToken: localStorage.getItem('admin_token') || null,
  user: JSON.parse(localStorage.getItem('user_data') || 'null'),
  currency: localStorage.getItem('currency') || 'EGP',
  language: localStorage.getItem('language') || 'ar',
  theme: localStorage.getItem('theme') || 'dark',
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
  settings: null,
  currencies: [],
  logoClickCount: 0,
  logoClickTimer: null,
  onlineUsers: 0,
  socket: null,
};

/* ==================== « ’«· Socket.IO ==================== */
function initSocket() {
  if (typeof io === 'undefined') return;
  AppState.socket = io();

  AppState.socket.on('online_users', (count) => {
    AppState.onlineUsers = count;
    document.querySelectorAll('.online-count').forEach(el => {
      el.textContent = count.toLocaleString('ar');
    });
  });

  AppState.socket.on('new_notification', (notif) => {
    showToast(notif.title, 'info');
    updateNotificationBadge();
  });

  if (AppState.user) {
    AppState.socket.on(`order_update_${AppState.user.id}`, (data) => {
      showToast(data.message, 'success');
      updateOrdersBadge();
    });

    AppState.socket.on(`notification_${AppState.user.id}`, (notif) => {
      showToast(notif.title, 'info');
      updateNotificationBadge();
    });

    AppState.socket.on(`review_update_${AppState.user.id}`, (data) => {
      showToast(data.message, data.status === 'approved' ? 'success' : 'warning');
    });
  }
}

/* ==================== API Wrapper ==================== */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (AppState.token) headers['Authorization'] = `Bearer ${AppState.token}`;
  if (AppState.adminToken && endpoint.includes('/admin') || endpoint.includes('/dashboard')) {
    headers['Authorization'] = `Bearer ${AppState.adminToken}`;
  }

  /* «” Œœ«„ «· Êﬂ‰ «·’ÕÌÕ Õ”» ‰Ê⁄ «·ÿ·» */
  const isAdminRoute = options.adminRoute || false;
  if (isAdminRoute && AppState.adminToken) {
    headers['Authorization'] = `Bearer ${AppState.adminToken}`;
  } else if (AppState.token) {
    headers['Authorization'] = `Bearer ${AppState.token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      body: options.body instanceof FormData ? options.body :
            options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json();
    if (!res.ok && res.status === 401) {
      /* «‰ Â  «·Ã·”… */
      if (isAdminRoute) {
        localStorage.removeItem('admin_token');
        AppState.adminToken = null;
        if (document.getElementById('admin-panel')?.classList.contains('active')) {
          showAdminLogin();
        }
      }
    }
    return data;
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, message: ' ⁄–— «·« ’«· »«·Œ«œ„' };
  }
}

/* API ··√œ„‰ */
async function adminAPI(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, adminRoute: true,
    headers: { ...options.headers, 'Authorization': `Bearer ${AppState.adminToken}` }
  });
}

/* ==================== ‰Ÿ«„ «·ÀÌ„ ==================== */
function initTheme() {
  const theme = AppState.theme;
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  AppState.theme = next;
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = theme === 'dark' ? 'icon-sun' : 'icon-moon';
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.title = theme === 'dark' ? '«·Ê÷⁄ «·‰Â«—Ì' : '«·Ê÷⁄ «··Ì·Ì';
}

/* ==================== «·”·… ==================== */
function getCart() {
  return AppState.cart;
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(AppState.cart));
  updateCartBadge();
  renderCartItems();
}

function addToCart(product, quantity = 1) {
  const existing = AppState.cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    AppState.cart.push({ ...product, quantity });
  }
  saveCart();
  showToast(` „ ≈÷«›… ${product.name} ··”·… ??`, 'success');
  animateCartButton();
}

function removeFromCart(productId) {
  AppState.cart = AppState.cart.filter(item => item.id !== productId);
  saveCart();
}

function updateCartQuantity(productId, qty) {
  const item = AppState.cart.find(i => i.id === productId);
  if (item) {
    if (qty <= 0) removeFromCart(productId);
    else item.quantity = qty;
    saveCart();
  }
}

function clearCart() {
  AppState.cart = [];
  saveCart();
}

function getCartTotal() {
  return AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartCount() {
  return AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function animateCartButton() {
  const btn = document.getElementById('cart-btn');
  if (btn) {
    btn.classList.add('bounce');
    setTimeout(() => btn.classList.remove('bounce'), 600);
  }
}

function renderCartItems() {
  const container = document.getElementById('cart-items');
  if (!container) return;
  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">??</div>
        <h3>«·”·… ›«—€…</h3>
        <p>√÷› „‰ Ã«  · »œ√ ÿ·»ﬂ</p>
      </div>`;
    updateCartSummary(0, 0, 0);
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-img">
        ${item.main_image ? `<img src="${item.main_image}" alt="${item.name}" loading="lazy">` : '<div class="no-img">???</div>'}
      </div>
      <div class="cart-item-info">
        <h4 class="cart-item-name">${item.name}</h4>
        <div class="cart-item-price">${formatPrice(item.price)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">?</button>
        <span class="qty-num">${item.quantity}</span>
        <button class="qty-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
      </div>
      <div class="cart-item-total">${formatPrice(item.price * item.quantity)}</div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
        <i class="icon-trash"></i>
      </button>
    </div>
  `).join('');

  updateCartSummary(getCartTotal(), AppState.cartDiscount || 0, 0);
}

function updateCartSummary(subtotal, discount, shipping) {
  const total = subtotal - discount + shipping;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatPrice(val); };
  set('cart-subtotal', subtotal);
  set('cart-discount', discount);
  set('cart-total', Math.max(0, total));
}

/* ==================== «·„›÷·… ==================== */
function toggleFavorite(productId, productName) {
  const idx = AppState.favorites.indexOf(productId);
  if (idx > -1) {
    AppState.favorites.splice(idx, 1);
    showToast(` „ ≈“«·… ${productName} „‰ «·„›÷·…`, 'info');
  } else {
    AppState.favorites.push(productId);
    showToast(` „ ≈÷«›… ${productName} ··„›÷·… ??`, 'success');
  }
  localStorage.setItem('favorites', JSON.stringify(AppState.favorites));
  updateFavBadge();
  document.querySelectorAll(`.fav-btn[data-id="${productId}"]`).forEach(btn => {
    btn.classList.toggle('active', AppState.favorites.includes(productId));
  });
}

function isFavorite(productId) {
  return AppState.favorites.includes(productId);
}

function updateFavBadge() {
  const count = AppState.favorites.length;
  document.querySelectorAll('.fav-badge').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

/* ==================== «·⁄„·«  ==================== */
function formatPrice(amount, currency = null) {
  const curr = currency || AppState.currency;
  const rate = AppState.currencies.find(c => c.code === curr)?.exchange_rate || 1;
  const converted = amount * rate;

  const symbols = { EGP: 'Ã.„', USD: '$', SAR: '—.”', AED: 'œ.≈', TRY: '?', JOD: 'œ.√' };
  const sym = symbols[curr] || curr;

  return curr === 'USD' || curr === 'AED'
    ? `${sym} ${converted.toFixed(2)}`
    : `${converted.toFixed(0)} ${sym}`;
}

async function loadCurrencies() {
  const res = await apiRequest('/auth/currencies');
  if (res.success) AppState.currencies = res.currencies;
}

function setCurrency(code) {
  AppState.currency = code;
  localStorage.setItem('currency', code);
  document.querySelectorAll('.product-price').forEach(el => {
    const base = parseFloat(el.dataset.price);
    if (!isNaN(base)) el.textContent = formatPrice(base);
  });
  closeModals();
  showToast(' „  €ÌÌ— «·⁄„·…', 'success');
}

/* ==================== «·≈‘⁄«—«  - Toast ==================== */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { success: '?', error: '?', warning: '??', info: '??' };
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">◊</button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

function createToastContainer() {
  const el = document.createElement('div');
  el.id = 'toast-container';
  document.body.appendChild(el);
  return el;
}

/* ==================== Loading ==================== */
function showLoading(message = 'Ã«—Ì «· Õ„Ì·...') {
  const overlay = document.getElementById('loading-overlay');
  const msg = document.getElementById('loading-message');
  if (overlay) overlay.classList.add('active');
  if (msg) msg.textContent = message;
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.remove('active');
}

/* ==================== Modal ==================== */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function closeModals() {
  document.querySelectorAll('.modal.active').forEach(m => {
    m.classList.remove('active');
  });
  document.body.style.overflow = '';
}

/* ==================== «Œ ’«— ·ÊÕ… «· Õﬂ„ - 7 ‰ﬁ—«  ⁄·Ï «·‘⁄«— ==================== */
function initLogoClickSecret() {
  const logo = document.getElementById('store-logo');
  if (!logo) return;

  logo.addEventListener('click', (e) => {
    AppState.logoClickCount++;

    /* ≈⁄«œ… «·÷»ÿ »⁄œ 5 ÀÊ«‰Ì */
    clearTimeout(AppState.logoClickTimer);
    AppState.logoClickTimer = setTimeout(() => {
      AppState.logoClickCount = 0;
    }, CLICK_RESET_TIMEOUT);

    /* ≈ŸÂ«—  ·„ÌÕ »’—Ì */
    if (AppState.logoClickCount >= 3) {
      logo.style.transform = `scale(${1 + (AppState.logoClickCount - 2) * 0.05})`;
      setTimeout(() => { logo.style.transform = ''; }, 200);
    }

    if (AppState.logoClickCount >= ADMIN_CLICKS_REQUIRED) {
      AppState.logoClickCount = 0;
      clearTimeout(AppState.logoClickTimer);
      /* › Õ ·ÊÕ… «· Õﬂ„ */
      openAdminPanel();
    }
  });
}

function openAdminPanel() {
  if (AppState.adminToken) {
    /* „”Ã· œŒÊ· »«·›⁄· */
    activateSection('admin-panel');
    if (typeof loadDashboard === 'function') loadDashboard();
  } else {
    /* › Õ ’›Õ…  ”ÃÌ· œŒÊ· «·√œ„‰ */
    activateSection('admin-login-section');
  }
  showToast('?? ·ÊÕ… «· Õﬂ„', 'info');
}

function showAdminLogin() {
  activateSection('admin-login-section');
}

/* ==================== «· ‰ﬁ· »Ì‰ «·√ﬁ”«„ ==================== */
function activateSection(sectionId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function navigateTo(sectionId) {
  activateSection(sectionId);
  closeSidebar();
}

/* ==================== Sidebar ==================== */
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

/* ==================== ≈‘⁄«—«  - Badge ==================== */
async function updateNotificationBadge() {
  if (!AppState.token) return;
  const res = await apiRequest('/notifications/unread-count');
  if (res.success) {
    document.querySelectorAll('.notif-badge').forEach(el => {
      el.textContent = res.unread;
      el.style.display = res.unread > 0 ? 'flex' : 'none';
    });
  }
}

async function updateOrdersBadge() {
  /*  ÕœÌÀ ·«Õﬁ« */
}

/* ==================== Ã·» ≈⁄œ«œ«  «·„ Ã— ==================== */
async function loadSettings() {
  const res = await apiRequest('/auth/settings');
  if (res.success) {
    AppState.settings = res.settings;
    applySettings(res.settings);
  }
}

function applySettings(settings) {
  if (!settings) return;
  /* «”„ «·„ Ã— */
  document.querySelectorAll('.store-name-text').forEach(el => el.textContent = settings.store_name || 'SMART MENU');
  /* «·Ê’› */
  document.querySelectorAll('.store-desc-text').forEach(el => el.textContent = settings.store_description || '');
  /* «··Ê‰ «·√”«”Ì */
  if (settings.theme_color) document.documentElement.style.setProperty('--primary', settings.theme_color);
  /* «·‘⁄«— */
  if (settings.store_logo) {
    document.querySelectorAll('.store-logo-img').forEach(el => { el.src = settings.store_logo; el.style.display = ''; });
  }
  /* SEO */
  if (settings.meta_title) document.title = settings.meta_title;
  if (settings.meta_description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.name = 'description'; document.head.appendChild(metaDesc); }
    metaDesc.content = settings.meta_description;
  }
  /* Ê÷⁄ «·’Ì«‰… */
  if (settings.maintenance_mode == 1) {
    activateSection('maintenance-section');
  }
}

/* ==================== Skeleton Loading ==================== */
function renderSkeleton(container, count = 4, type = 'card') {
  if (!container) return;
  container.innerHTML = Array(count).fill(`
    <div class="skeleton-${type}">
      <div class="skeleton-img"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
    </div>
  `).join('');
}

/* ==================== Ê÷⁄ ⁄œ„ «·« ’«· ==================== */
window.addEventListener('offline', () => showToast('?? ·« ÌÊÃœ « ’«· »«·≈‰ —‰ ', 'warning', 10000));
window.addEventListener('online', () => showToast('?  „ «” ⁄«œ… «·« ’«·', 'success'));

/* ==================== «·—ÃÊ⁄ ··√⁄·Ï ==================== */
function initScrollToTop() {
  const btn = document.getElementById('scroll-top-btn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ==================== ≈€·«ﬁ »«·‰ﬁ— Œ«—Ã ==================== */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) closeModals();
  if (e.target.id === 'sidebar-overlay') closeSidebar();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModals(); closeSidebar(); }
});

/* ====================  ‰”Ìﬁ «· «—ÌŒ ==================== */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return '„‰– ·ÕŸ« ';
  if (diff < 3600) return `„‰– ${Math.floor(diff / 60)} œﬁÌﬁ…`;
  if (diff < 86400) return `„‰– ${Math.floor(diff / 3600)} ”«⁄…`;
  return `„‰– ${Math.floor(diff / 86400)} ÌÊ„`;
}

/* ====================  ÂÌ∆… «· ÿ»Ìﬁ «·—∆Ì”Ì ==================== */
document.addEventListener('DOMContentLoaded', async () => {
  /*  ÿ»Ìﬁ «·ÀÌ„ */
  initTheme();

  /* Ã·» «·≈⁄œ«œ«  */
  await loadSettings();

  /*  Õ„Ì· «·⁄„·«  */
  await loadCurrencies();

  /*  ›⁄Ì· Socket.IO */
  initSocket();

  /*  ÂÌ∆… «·“— «·—ÃÊ⁄ ··√⁄·Ï */
  initScrollToTop();

  /*  ÂÌ∆… «Œ ’«— «·√œ„‰ (7 ‰ﬁ—« ) */
  initLogoClickSecret();

  /*  ÕœÌÀ «·‘«—«  */
  updateCartBadge();
  updateFavBadge();

  /*  Õ„Ì· «·»Ì«‰«  */
  if (typeof initStore === 'function') initStore();

  /*  ”ÃÌ· Service Worker ··‹ PWA */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  /* ≈Œ›«¡ ‘«‘… «· Õ„Ì· */
  const splash = document.getElementById('splash-screen');
  if (splash) {
    setTimeout(() => {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 500);
    }, 800);
  }
});
