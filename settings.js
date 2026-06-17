/* ================================================
   settings.js - ÅÚÏÇÏÇÊ ÇáãÊÌÑ æÇáãÓÊÎÏã
   íÔãá: ÇááÛÉ¡ ÇáÚãáÉ¡ ÇáæÖÚ Çááíáí
   ================================================ */

/* ==================== ÇááÛÉ ==================== */
const translations = {
  ar: {
    home: 'ÇáÑÆíÓíÉ', offers: 'ÇáÚÑæÖ', categories: 'ÇáÃÞÓÇã', cart: 'ÇáÓáÉ',
    favorites: 'ÇáãÝÖáÉ', orders: 'ÇáØáÈÇÊ', notifications: 'ÇáÅÔÚÇÑÇÊ',
    account: 'ÇáÍÓÇÈ', search: 'ÈÍË...', login: 'ÊÓÌíá ÇáÏÎæá',
    register: 'ÅäÔÇÁ ÍÓÇÈ', logout: 'ÎÑæÌ', add_to_cart: 'ÃÖÝ ááÓáÉ',
    available: 'ãÊæÝÑ', unavailable: 'ÛíÑ ãÊæÝÑ', out_of_stock: 'äÝÐÊ ÇáßãíÉ',
    loading: 'ÌÇÑí ÇáÊÍãíá...', error: 'ÍÏË ÎØÃ', no_data: 'áÇ ÊæÌÏ ÈíÇäÇÊ',
    close: 'ÅÛáÇÞ', save: 'ÍÝÙ', cancel: 'ÅáÛÇÁ', delete: 'ÍÐÝ', edit: 'ÊÚÏíá',
    total: 'ÇáÅÌãÇáí', subtotal: 'ÇáãÌãæÚ ÇáÝÑÚí', discount: 'ÇáÎÕã',
    checkout: 'ÅÊãÇã ÇáØáÈ', order_success: 'Êã ÅÑÓÇá ØáÈß ÈäÌÇÍ!',
  },
  en: {
    home: 'Home', offers: 'Offers', categories: 'Categories', cart: 'Cart',
    favorites: 'Favorites', orders: 'My Orders', notifications: 'Notifications',
    account: 'Account', search: 'Search...', login: 'Login',
    register: 'Register', logout: 'Logout', add_to_cart: 'Add to Cart',
    available: 'Available', unavailable: 'Unavailable', out_of_stock: 'Out of Stock',
    loading: 'Loading...', error: 'An error occurred', no_data: 'No data',
    close: 'Close', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    total: 'Total', subtotal: 'Subtotal', discount: 'Discount',
    checkout: 'Checkout', order_success: 'Order placed successfully!',
  },
  tr: {
    home: 'Ana Sayfa', offers: 'Teklifler', categories: 'Kategoriler', cart: 'Sepet',
    favorites: 'Favoriler', orders: 'Sipari?lerim', notifications: 'Bildirimler',
    account: 'Hesap', search: 'Ara...', login: 'Giri? Yap',
    register: 'Kay?t Ol', logout: 'C?k??', add_to_cart: 'Sepete Ekle',
    available: 'Mevcut', unavailable: 'Mevcut De?il', out_of_stock: 'Stok Yok',
    loading: 'Yükleniyor...', error: 'Bir hata olu?tu', no_data: 'Veri yok',
    close: 'Kapat', save: 'Kaydet', cancel: '?ptal', delete: 'Sil', edit: 'Düzenle',
    total: 'Toplam', subtotal: 'Ara Toplam', discount: '?ndirim',
    checkout: '?demeye Geç', order_success: 'Sipari?iniz ba?ar?yla al?nd?!',
  }
};

function setLanguage(langCode) {
  AppState.language = langCode;
  localStorage.setItem('language', langCode);

  /* ÇÊÌÇå ÇáÕÝÍÉ */
  const dir = langCode === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', langCode);

  /* ÊØÈíÞ ÇáÊÑÌãÉ */
  const t = translations[langCode] || translations['ar'];
  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.dataset.translate;
    if (t[key]) el.textContent = t[key];
  });

  /* ÊÍÏíË placeholder */
  document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
    const key = el.dataset.translatePlaceholder;
    if (t[key]) el.placeholder = t[key];
  });

  closeModals();
  showToast('Êã ÊÛííÑ ÇááÛÉ', 'success');
}

function translate(key) {
  const t = translations[AppState.language] || translations['ar'];
  return t[key] || key;
}

/* ==================== ÞÇÆãÉ ÊÛííÑ ÇááÛÉ ==================== */
async function openLanguageSelector() {
  const res = await apiRequest('/auth/languages');
  if (!res.success) return;

  const modal = document.getElementById('language-modal');
  const list = document.getElementById('language-list');
  if (list) {
    list.innerHTML = res.languages.map(lang => `
      <div class="lang-option ${lang.code === AppState.language ? 'active' : ''}" onclick="setLanguage('${lang.code}'); closeModal('language-modal');">
        <span class="lang-flag">${lang.flag}</span>
        <span class="lang-name">${lang.name}</span>
        ${lang.code === AppState.language ? '<span class="lang-check">?</span>' : ''}
      </div>
    `).join('');
  }
  openModal('language-modal');
}

/* ==================== ÞÇÆãÉ ÊÛííÑ ÇáÚãáÉ ==================== */
async function openCurrencySelector() {
  const modal = document.getElementById('currency-modal');
  const list = document.getElementById('currency-list');
  if (list) {
    list.innerHTML = AppState.currencies.map(c => `
      <div class="currency-option ${c.code === AppState.currency ? 'active' : ''}" onclick="setCurrency('${c.code}')">
        <span class="currency-symbol">${c.symbol}</span>
        <span class="currency-name">${c.name}</span>
        <span class="currency-code">${c.code}</span>
        ${c.code === AppState.currency ? '<span class="currency-check">?</span>' : ''}
      </div>
    `).join('');
  }
  openModal('currency-modal');
}

/* ÊåíÆÉ ÇáÅÚÏÇÏÇÊ ÚäÏ ÇáÊÍãíá */
document.addEventListener('DOMContentLoaded', () => {
  const lang = localStorage.getItem('language') || 'ar';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
});
