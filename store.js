/* ================================================
   store.js - Ê«ÃÂ… «·„ Ã— «·—∆Ì”Ì…
   Ì‘„·: «·”·«Ìœ—° «·√ﬁ”«„° «·„‰ Ã« ° «·»ÕÀ
   ================================================ */

/* ==================== „ €Ì—«  «·„ Ã— ==================== */
let currentCategory = 'all';
let currentSort = 'sort_order';
let currentPage = 1;
let totalPages = 1;
let allCategories = [];
let allProducts = [];
let sliderInterval = null;
let currentSlide = 0;
let sliderData = [];
let selectedProduct = null;
let cartCoupon = null;

/* ====================  ÂÌ∆… «·„ Ã— ==================== */
async function initStore() {
  showPageLoading();
  try {
    await Promise.all([
      loadBanners(),
      loadCategories(),
      loadPopularProducts(),
      loadProducts(),
      loadPublicReviews(),
      loadFaq(),
    ]);
    initCategorySlider();
    initProductFilters();
    renderCartItems();
    updateCartBadge();
    updateFavBadge();
  } catch (e) {
    console.error('Œÿ√ ›Ì  ÂÌ∆… «·„ Ã—:', e);
  }
  hidePageLoading();
}

function showPageLoading() {
  document.querySelectorAll('.products-grid, .categories-slider, .banners-slider').forEach(el => {
    renderSkeleton(el, 4);
  });
}

function hidePageLoading() {
  /* «·‹ skeleton ÌıÕ–› ⁄‰œ ⁄—÷ «·»Ì«‰«  «·›⁄·Ì… */
}

/* ==================== «·»‰—«  - Hero Slider ==================== */
async function loadBanners() {
  const res = await apiRequest('/products/banners/list');
  if (!res.success || !res.banners?.length) {
    /* »‰—«  «› —«÷Ì… */
    sliderData = [
      { title: '√Â·« »ﬂ ›Ì „ Ã—‰« ???', description: '«” „ ⁄ »√‘ÂÏ «·√ﬂ·«  «·ÿ«“Ã…', button_text: ' ’›Õ «·„‰ÌÊ', image: '' },
      { title: '⁄—Ê÷ Õ’—Ì… ÌÊ„Ì« ??', description: 'Œ’Ê„«   ’· ≈·Ï 30% ⁄·Ï «·„‰ Ã«  «·„Œ «—…', button_text: '«ﬂ ‘› «·⁄—Ê÷', image: '' },
    ];
  } else {
    sliderData = res.banners;
  }
  renderSlider();
}

function renderSlider() {
  const container = document.getElementById('hero-slider');
  if (!container) return;

  if (!sliderData.length) return;

  container.innerHTML = `
    <div class="slider-track">
      ${sliderData.map((banner, i) => `
        <div class="slide ${i === 0 ? 'active' : ''}" data-index="${i}">
          <div class="slide-bg" style="${banner.image ? `background-image:url(${banner.image})` : 'background: linear-gradient(135deg, var(--primary) 0%, #ff9500 100%)'}">
            <div class="slide-overlay"></div>
          </div>
          <div class="slide-content">
            <h1 class="slide-title animate-up">${banner.title}</h1>
            <p class="slide-desc animate-up delay-1">${banner.description || ''}</p>
            <button class="btn btn-primary btn-lg animate-up delay-2" onclick="navigateTo('products-section')">
              ${banner.button_text || '«ÿ·» «·¬‰'}
            </button>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="slider-dots">
      ${sliderData.map((_, i) => `<button class="dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`).join('')}
    </div>
    <button class="slider-arrow prev" onclick="prevSlide()"><i class="icon-chevron-right"></i></button>
    <button class="slider-arrow next" onclick="nextSlide()"><i class="icon-chevron-left"></i></button>
  `;

  startSlider();

  /* ≈Ìﬁ«› ⁄‰œ «· ›«⁄· */
  container.addEventListener('mouseenter', () => clearInterval(sliderInterval));
  container.addEventListener('mouseleave', startSlider);
}

function startSlider() {
  clearInterval(sliderInterval);
  sliderInterval = setInterval(nextSlide, 5000);
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.slider-dots .dot');
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  currentSlide = index;
  slides[index]?.classList.add('active');
  dots[index]?.classList.add('active');
}

function nextSlide() {
  const total = sliderData.length;
  goToSlide((currentSlide + 1) % total);
}

function prevSlide() {
  const total = sliderData.length;
  goToSlide((currentSlide - 1 + total) % total);
}

/* ·„” «·‘«‘… ··‹ Swipe */
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
document.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].screenX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) nextSlide(); else prevSlide();
  }
});

/* ==================== «·√ﬁ”«„ (Categories) ==================== */
async function loadCategories() {
  const res = await apiRequest('/products/categories');
  if (!res.success) return;
  allCategories = res.categories;
  renderCategories();
}

function renderCategories() {
  const container = document.getElementById('categories-list');
  if (!container) return;

  const defaultEmojis = ['??', '??', '??', '??', '??', '??', '??', '??'];

  container.innerHTML = `
    <div class="category-card all ${currentCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">
      <div class="cat-icon">???</div>
      <div class="cat-info">
        <h4>«·ﬂ·</h4>
      </div>
    </div>
    ${allCategories.map((cat, i) => `
      <div class="category-card ${currentCategory == cat.id ? 'active' : ''}" onclick="filterByCategory(${cat.id})">
        <div class="cat-img-wrap">
          ${cat.image
            ? `<img src="${cat.image}" alt="${cat.name}" loading="lazy">`
            : `<div class="cat-icon">${defaultEmojis[i % defaultEmojis.length]}</div>`
          }
        </div>
        <div class="cat-info">
          <h4>${cat.name}</h4>
          ${cat.products_count > 0 ? `<span class="cat-count">${cat.products_count} „‰ Ã</span>` : ''}
        </div>
      </div>
    `).join('')}
  `;
}

function initCategorySlider() {
  const list = document.getElementById('categories-list');
  if (!list) return;
  let isDown = false;
  let startX;
  let scrollLeft;

  list.addEventListener('mousedown', e => { isDown = true; startX = e.pageX - list.offsetLeft; scrollLeft = list.scrollLeft; });
  list.addEventListener('mouseleave', () => isDown = false);
  list.addEventListener('mouseup', () => isDown = false);
  list.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - list.offsetLeft;
    list.scrollLeft = scrollLeft - (x - startX);
  });
}

function filterByCategory(catId) {
  currentCategory = catId;
  currentPage = 1;
  /*  ÕœÌÀ UI */
  document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`.category-card[onclick*="${catId}"]`)?.classList.add('active');
  loadProducts();
  navigateTo('products-section');
}

/* ==================== «·„‰ Ã«  «·‘⁄»Ì… ==================== */
async function loadPopularProducts() {
  const container = document.getElementById('popular-products');
  if (!container) return;
  renderSkeleton(container, 4, 'product');

  const res = await apiRequest('/products/popular');
  if (!res.success || !res.products?.length) {
    container.innerHTML = '<p class="no-data">·«  ÊÃœ „‰ Ã«  ‘⁄»Ì… Õ«·Ì«</p>';
    return;
  }

  container.innerHTML = res.products.map(p => renderProductCard(p)).join('');
}

/* ==================== «·„‰ Ã«  «·—∆Ì”Ì… ==================== */
async function loadProducts() {
  const container = document.getElementById('products-grid');
  if (!container) return;
  renderSkeleton(container, 8, 'product');

  const params = new URLSearchParams({
    page: currentPage,
    limit: 12,
    sort: currentSort,
  });
  if (currentCategory !== 'all') params.set('category_id', currentCategory);

  const res = await apiRequest(`/products?${params}`);
  if (!res.success) {
    container.innerHTML = `<div class="error-state"><p>ÕœÀ Œÿ√ ›Ì «· Õ„Ì·</p><button onclick="loadProducts()" class="btn btn-primary">≈⁄«œ… «·„Õ«Ê·…</button></div>`;
    return;
  }

  if (!res.products?.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">???</div><h3>·«  ÊÃœ „‰ Ã« </h3><p>·«  ÊÃœ „‰ Ã«  ›Ì Â–« «·ﬁ”„ Õ«·Ì«</p></div>`;
    return;
  }

  allProducts = res.products;
  totalPages = res.pages;
  container.innerHTML = res.products.map(p => renderProductCard(p)).join('');
  renderPagination('products-pagination', currentPage, totalPages, goToPage);

  /*  ÕœÌÀ √“—«— «·„›÷·… */
  updateFavButtons();
}

function renderProductCard(product) {
  const isAvail = product.status === 'available';
  const isOutOfStock = product.status === 'out_of_stock';
  const isFav = isFavorite(product.id);

  const statusBadge = !isAvail
    ? `<div class="product-status-badge ${isOutOfStock ? 'out-of-stock' : 'unavailable'}">${isOutOfStock ? '‰›–  «·ﬂ„Ì…' : '€Ì— „ Ê›—'}</div>`
    : product.discount > 0 ? `<div class="product-status-badge discount">Œ’„ ${product.discount}%</div>` : '';

  return `
    <div class="product-card ${!isAvail ? 'unavailable' : ''}" data-product-id="${product.id}">
      <div class="product-img-wrap" onclick="openProductModal(${product.id})">
        ${statusBadge}
        ${product.main_image
          ? `<img src="${product.main_image}" alt="${product.name}" loading="lazy" class="product-img">`
          : `<div class="product-img-placeholder"><span>???</span></div>`
        }
        <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${product.id}" onclick="handleFavorite(event, ${product.id}, '${product.name}')">
          <i class="icon-heart"></i>
        </button>
      </div>
      <div class="product-info">
        <div class="product-category">${product.category_name || ''}</div>
        <h3 class="product-name" onclick="openProductModal(${product.id})">${product.name}</h3>
        ${product.short_description ? `<p class="product-desc">${product.short_description}</p>` : ''}
        <div class="product-meta">
          ${product.rating > 0 ? `<div class="product-rating">${renderStars(product.rating)} <span>(${product.reviews_count})</span></div>` : ''}
          <div class="product-views"><i class="icon-eye"></i> ${(product.views || 0).toLocaleString('ar')}</div>
        </div>
        <div class="product-footer">
          <div class="product-prices">
            <span class="price-current product-price" data-price="${product.price}">${formatPrice(product.price)}</span>
            ${product.old_price > 0 ? `<span class="price-old product-price" data-price="${product.old_price}">${formatPrice(product.old_price)}</span>` : ''}
          </div>
          ${isAvail
            ? `<button class="btn btn-primary btn-add-cart" onclick="addToCart({id:${product.id},name:'${product.name}',price:${product.price},main_image:'${product.main_image}'},1)">
                <i class="icon-plus"></i> √÷›
               </button>`
            : `<button class="btn btn-disabled" disabled>${isOutOfStock ? '‰›–  «·ﬂ„Ì…' : '€Ì— „ Ê›—'}</button>`
          }
        </div>
      </div>
    </div>
  `;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) stars += '<i class="icon-star filled"></i>';
    else if (i === full && half) stars += '<i class="icon-star half"></i>';
    else stars += '<i class="icon-star"></i>';
  }
  return `<span class="stars">${stars} <span class="rating-num">${parseFloat(rating).toFixed(1)}</span></span>`;
}

function handleFavorite(e, productId, productName) {
  e.stopPropagation();
  if (!AppState.user) {
    showToast('ÌÃ»  ”ÃÌ· «·œŒÊ· ··≈÷«›… ··„›÷·…', 'warning');
    openModal('login-modal');
    return;
  }
  toggleFavorite(productId, productName);
}

function updateFavButtons() {
  document.querySelectorAll('.fav-btn').forEach(btn => {
    const id = parseInt(btn.dataset.id);
    btn.classList.toggle('active', isFavorite(id));
  });
}

/* ====================  ’›Ì… Ê›—“ «·„‰ Ã«  ==================== */
function initProductFilters() {
  /* ·« ‘Ì¡ ≈÷«›Ì Â‰« */
}

function sortProducts(sort) {
  currentSort = sort;
  currentPage = 1;
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.sort-btn[onclick*="${sort}"]`)?.classList.add('active');
  loadProducts();
}

function changeView(view) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.className = `products-grid view-${view}`;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.view-btn[onclick*="${view}"]`)?.classList.add('active');
}

function goToPage(page) {
  currentPage = page;
  loadProducts();
  document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPagination(containerId, current, total, callback) {
  const container = document.getElementById(containerId);
  if (!container || total <= 1) { if (container) container.innerHTML = ''; return; }

  let pages = '';
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 2) {
      pages += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="${callback.name}(${i})">${i}</button>`;
    } else if (Math.abs(i - current) === 3) {
      pages += '<span class="page-dots">...</span>';
    }
  }

  container.innerHTML = `
    <button class="page-btn" onclick="${callback.name}(${current - 1})" ${current === 1 ? 'disabled' : ''}><i class="icon-chevron-right"></i></button>
    ${pages}
    <button class="page-btn" onclick="${callback.name}(${current + 1})" ${current === total ? 'disabled' : ''}><i class="icon-chevron-left"></i></button>
  `;
}

/* ====================  ›«’Ì· «·„‰ Ã ==================== */
async function openProductModal(productId) {
  openModal('product-modal');
  const body = document.getElementById('product-modal-body');
  if (body) body.innerHTML = '<div class="loading-spinner"></div>';

  const res = await apiRequest(`/products/${productId}`);
  if (!res.success) {
    if (body) body.innerHTML = '<p class="error">ÕœÀ Œÿ√ ›Ì «· Õ„Ì·</p>';
    return;
  }

  const p = res.product;
  selectedProduct = p;

  if (body) {
    body.innerHTML = `
      <div class="product-detail">
        <div class="product-detail-gallery">
          <div class="main-img-wrap">
            ${p.main_image
              ? `<img src="${p.main_image}" alt="${p.name}" class="detail-main-img" id="detail-main-img">`
              : `<div class="no-img-lg">???</div>`
            }
          </div>
          ${res.images?.length > 0 ? `
            <div class="thumb-list">
              ${p.main_image ? `<img src="${p.main_image}" class="thumb active" onclick="changeDetailImg('${p.main_image}', this)">` : ''}
              ${res.images.map(img => `<img src="${img.image}" class="thumb" onclick="changeDetailImg('${img.image}', this)">`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="product-detail-info">
          <div class="detail-category">${p.category_name || ''}</div>
          <h2 class="detail-title">${p.name}</h2>
          ${p.short_description ? `<p class="detail-desc">${p.short_description}</p>` : ''}
          ${p.rating > 0 ? `<div class="detail-rating">${renderStars(p.rating)} <span class="review-count">(${p.reviews_count}  ﬁÌÌ„)</span></div>` : ''}
          <div class="detail-prices">
            <span class="detail-price product-price" data-price="${p.price}">${formatPrice(p.price)}</span>
            ${p.old_price > 0 ? `<span class="detail-old-price product-price" data-price="${p.old_price}">${formatPrice(p.old_price)}</span>` : ''}
            ${p.discount > 0 ? `<span class="detail-discount">Ê›¯— ${p.discount}%</span>` : ''}
          </div>
          <div class="detail-status ${p.status}">
            ${p.status === 'available' ? '? „ Ê›—' : p.status === 'out_of_stock' ? '? ‰›–  «·ﬂ„Ì…' : '? €Ì— „ Ê›—'}
          </div>
          ${p.full_description ? `<div class="detail-full-desc">${p.full_description}</div>` : ''}
          ${p.status === 'available' ? `
            <div class="detail-actions">
              <div class="qty-selector">
                <button onclick="changeDetailQty(-1)">?</button>
                <span id="detail-qty">1</span>
                <button onclick="changeDetailQty(1)">+</button>
              </div>
              <button class="btn btn-primary btn-add-detail" onclick="addToCartFromDetail()">
                <i class="icon-cart"></i> √÷› ··”·…
              </button>
              <button class="btn btn-outline fav-btn ${isFavorite(p.id) ? 'active' : ''}" data-id="${p.id}" onclick="handleFavorite(event, ${p.id}, '${p.name}')">
                <i class="icon-heart"></i>
              </button>
            </div>
          ` : `<button class="btn btn-disabled" disabled>${p.status === 'out_of_stock' ? '‰›–  «·ﬂ„Ì…' : '€Ì— „ Ê›—'}</button>`}
        </div>
      </div>
      ${res.reviews?.length > 0 ? `
        <div class="product-reviews-section">
          <h3>¬—«¡ «·⁄„·«¡</h3>
          <div class="reviews-list">
            ${res.reviews.map(r => renderReviewCard(r)).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }
}

function changeDetailImg(src, el) {
  document.getElementById('detail-main-img').src = src;
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function changeDetailQty(delta) {
  const el = document.getElementById('detail-qty');
  if (!el) return;
  const current = parseInt(el.textContent);
  el.textContent = Math.max(1, current + delta);
}

function addToCartFromDetail() {
  if (!selectedProduct) return;
  const qty = parseInt(document.getElementById('detail-qty')?.textContent || 1);
  addToCart(selectedProduct, qty);
  closeModal('product-modal');
}

/* ==================== «· ⁄·Ìﬁ«  «·⁄«„… ==================== */
async function loadPublicReviews() {
  const container = document.getElementById('public-reviews');
  if (!container) return;

  const res = await apiRequest('/reviews?limit=6');
  if (!res.success || !res.reviews?.length) {
    container.innerHTML = '<p class="no-data">·«  ÊÃœ  ⁄·Ìﬁ«  Õ Ï «·¬‰</p>';
    return;
  }

  container.innerHTML = res.reviews.map(r => renderReviewCard(r)).join('');
}

function renderReviewCard(review) {
  return `
    <div class="review-card">
      <div class="review-header">
        <div class="reviewer-avatar">${review.customer_name.charAt(0)}</div>
        <div class="reviewer-info">
          <h4>${review.customer_name}</h4>
          ${review.customer_city ? `<span class="reviewer-city">?? ${review.customer_city}</span>` : ''}
        </div>
        <div class="review-rating">${renderStars(review.rating)}</div>
      </div>
      ${review.product_name ? `<div class="review-product">??? ${review.product_name}</div>` : ''}
      <p class="review-text">"${review.review}"</p>
      ${review.images?.length > 0 ? `
        <div class="review-imgs">
          ${review.images.map(img => `<img src="${img}" alt="’Ê—… «· ⁄·Ìﬁ" loading="lazy" onclick="openImageViewer('${img}')">`).join('')}
        </div>
      ` : ''}
      <div class="review-date">${timeAgo(review.created_at)}</div>
    </div>
  `;
}

/* ==================== «·√”∆·… «·‘«∆⁄… ==================== */
async function loadFaq() {
  const container = document.getElementById('faq-list');
  if (!container) return;

  const res = await apiRequest('/auth/faq');
  if (!res.success || !res.faqs?.length) return;

  container.innerHTML = res.faqs.map((faq, i) => `
    <div class="faq-item" onclick="toggleFaq(this)">
      <div class="faq-question">
        <span>${faq.question}</span>
        <i class="icon-chevron-down faq-icon"></i>
      </div>
      <div class="faq-answer">
        <p>${faq.answer}</p>
      </div>
    </div>
  `).join('');
}

function toggleFaq(el) {
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(f => f.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
}

/* ==================== ≈÷«›…  ⁄·Ìﬁ ==================== */
async function submitReview(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  if (!formData.get('customer_name') || !formData.get('review')) {
    showToast('√œŒ· «”„ﬂ Ê«· ⁄·Ìﬁ', 'warning');
    return;
  }

  if (AppState.user) {
    formData.set('user_id', AppState.user.id);
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Ã«—Ì «·≈—”«·...';

  const res = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: AppState.token ? { 'Authorization': `Bearer ${AppState.token}` } : {},
    body: formData
  }).then(r => r.json());

  btn.disabled = false;
  btn.textContent = '≈—”«· «· ⁄·Ìﬁ';

  if (res.success) {
    showToast(res.message, 'success');
    form.reset();
    resetStarRating();
  } else {
    showToast(res.message || 'ÕœÀ Œÿ√', 'error');
  }
}

/* ====================  ﬁÌÌ„ «·‰ÃÊ„ «· ›«⁄·Ì ==================== */
function initStarRating() {
  const stars = document.querySelectorAll('.star-input');
  stars.forEach(star => {
    star.addEventListener('mouseover', () => highlightStars(star.dataset.value));
    star.addEventListener('mouseout', () => highlightStars(document.querySelector('input[name="rating"]')?.value || 0));
    star.addEventListener('click', () => {
      document.querySelector('input[name="rating"]').value = star.dataset.value;
      highlightStars(star.dataset.value);
    });
  });
}

function highlightStars(value) {
  document.querySelectorAll('.star-input').forEach(s => {
    s.classList.toggle('active', s.dataset.value <= value);
  });
}

function resetStarRating() {
  document.querySelectorAll('.star-input').forEach(s => s.classList.remove('active'));
  const input = document.querySelector('input[name="rating"]');
  if (input) input.value = 0;
}

/* ==================== «·”·… - Modal ==================== */
function openCart() {
  renderCartItems();
  openModal('cart-modal');
}

async function applyCoupon() {
  const code = document.getElementById('coupon-input')?.value?.trim();
  if (!code) { showToast('√œŒ· ﬂÊœ «·ﬂÊ»Ê‰', 'warning'); return; }

  const subtotal = getCartTotal();
  const res = await apiRequest('/auth/coupons/validate', {
    method: 'POST',
    body: { code, subtotal }
  });

  if (res.success) {
    cartCoupon = { code, discount: res.discount, coupon: res.coupon };
    AppState.cartDiscount = res.discount;
    showToast(`?  „  ÿ»Ìﬁ «·ﬂÊ»Ê‰! Œ’„ ${formatPrice(res.discount)}`, 'success');
    updateCartSummary(subtotal, res.discount, 0);
  } else {
    showToast(res.message, 'error');
  }
}

function proceedToCheckout() {
  if (!AppState.cart.length) { showToast('«·”·… ›«—€…', 'warning'); return; }
  closeModal('cart-modal');
  openModal('checkout-modal');
  loadPaymentMethods();
}

/* ==================== ≈ŸÂ«— ’Ê—… »«·ÕÃ„ «·ﬂ»Ì— ==================== */
function openImageViewer(src) {
  const viewer = document.getElementById('image-viewer') || createImageViewer();
  viewer.querySelector('img').src = src;
  viewer.classList.add('active');
}

function createImageViewer() {
  const el = document.createElement('div');
  el.id = 'image-viewer';
  el.className = 'image-viewer';
  el.innerHTML = '<img src="" alt="’Ê—…"><button onclick="this.parentElement.classList.remove(\'active\')">◊</button>';
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('active'); });
  document.body.appendChild(el);
  return el;
}

/* ==================== «·„›÷·… - ’›Õ… ==================== */
async function loadFavoritesPage() {
  const container = document.getElementById('favorites-list');
  if (!container) return;

  const favIds = AppState.favorites;
  if (!favIds.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">??</div><h3>·«  ÊÃœ „›÷·« </h3><p>√÷› „‰ Ã«  ··„›÷·… „‰ «·„ Ã—</p></div>`;
    return;
  }

  /* Ã·» «·„‰ Ã«  «·„›÷·… */
  const products = [];
  for (const id of favIds) {
    const res = await apiRequest(`/products/${id}`);
    if (res.success) products.push(res.product);
  }

  container.innerHTML = products.map(p => renderProductCard(p)).join('');
}

/*  ÂÌ∆…  ﬁÌÌ„ «·‰ÃÊ„ ⁄‰œ  Õ„Ì· «·’›Õ… */
document.addEventListener('DOMContentLoaded', () => {
  initStarRating();
});
