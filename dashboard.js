/* ================================================
   dashboard.js - ·ÊÕ… «· Õﬂ„ «·«Õ —«›Ì…
   Ì‘„·: «·≈Õ’«∆Ì« ° «·„‰ Ã« ° «·ÿ·»« ° «·⁄„·«¡°
   «· ⁄·Ìﬁ« ° «·≈‘⁄«—« ° «·≈⁄œ«œ« ° «· Õ·Ì·« 
   ================================================ */

/* ==================== „ €Ì—«  ·ÊÕ… «· Õﬂ„ ==================== */
let currentAdminSection = 'dashboard-home';
let dashboardCharts = {};

/* ==================== «· ‰ﬁ· ›Ì ·ÊÕ… «· Õﬂ„ ==================== */
function showAdminSection(section) {
  if (!AppState.adminToken) { showAdminLogin(); return; }
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`admin-${section}`)?.classList.add('active');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.sidebar-link[onclick*="${section}"]`)?.classList.add('active');
  currentAdminSection = section;
  closeSidebar();

  /*  Õ„Ì· «·»Ì«‰«  Õ”» «·ﬁ”„ */
  const loaders = {
    'dashboard-home': loadDashboard,
    'products':       loadAdminProducts,
    'categories':     loadAdminCategories,
    'orders':         loadAdminOrders,
    'customers':      loadAdminCustomers,
    'reviews':        loadAdminReviews,
    'notifications':  loadAdminNotifications,
    'payments':       loadAdminPayments,
    'banners':        loadAdminBanners,
    'coupons':        loadAdminCoupons,
    'analytics':      loadAdminAnalytics,
    'settings':       loadAdminSettings,
    'activity-log':   loadActivityLog,
    'backups':        loadBackups,
    'faq':            loadAdminFaq,
    'pages':          loadAdminPages,
    'currencies':     loadAdminCurrencies,
    'languages':      loadAdminLanguages,
  };

  if (loaders[section]) loaders[section]();
}

/* ==================== Dashboard «·—∆Ì”Ì ==================== */
async function loadDashboard() {
  const res = await adminAPI('/auth/dashboard-stats');
  if (!res.success) return;

  const s = res.stats;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setEl('stat-orders',        s.orders_total?.toLocaleString('ar'));
  setEl('stat-pending',       s.orders_pending?.toLocaleString('ar'));
  setEl('stat-orders-today',  s.orders_today?.toLocaleString('ar'));
  setEl('stat-customers',     s.customers_total?.toLocaleString('ar'));
  setEl('stat-products',      s.products_total?.toLocaleString('ar'));
  setEl('stat-reviews',       s.reviews_pending?.toLocaleString('ar'));
  setEl('stat-revenue-today', formatPrice(s.revenue_today));
  setEl('stat-revenue-month', formatPrice(s.revenue_month));
  setEl('stat-revenue-total', formatPrice(s.revenue_total));

  /* ¬Œ— «·ÿ·»«  */
  renderRecentOrders(res.recent_orders || []);

  /* „»Ì⁄«  «·√”»Ê⁄ */
  renderWeeklySalesChart(res.weekly_sales || []);

  /* √ﬂÀ— «·„‰ Ã«  */
  renderTopProducts(res.top_products || []);

  /* ¬Œ— «·‰‘«ÿ«  */
  renderRecentActivities(res.recent_activities || []);
}

function renderRecentOrders(orders) {
  const container = document.getElementById('recent-orders-table');
  if (!container) return;
  if (!orders.length) { container.innerHTML = '<tr><td colspan="5" class="text-center">·«  ÊÃœ ÿ·»« </td></tr>'; return; }
  container.innerHTML = orders.map(o => `
    <tr onclick="openOrderDetail(${o.id})" class="clickable-row">
      <td><span class="order-num">${o.order_number}</span></td>
      <td>${o.customer_name}</td>
      <td><span class="badge badge-${getOrderStatusClass(o.status)}">${getOrderStatusText(o.status)}</span></td>
      <td>${formatPrice(o.total)}</td>
      <td>${timeAgo(o.created_at)}</td>
    </tr>
  `).join('');
}

function renderTopProducts(products) {
  const container = document.getElementById('top-products-list');
  if (!container) return;
  container.innerHTML = products.map((p, i) => `
    <div class="top-product-item">
      <span class="rank">${i + 1}</span>
      <div class="top-product-info"><strong>${p.name}</strong><small>${p.sold} ÿ·»</small></div>
      <span class="top-revenue">${formatPrice(p.revenue || 0)}</span>
    </div>
  `).join('') || '<p class="no-data">·«  ÊÃœ »Ì«‰« </p>';
}

function renderRecentActivities(activities) {
  const container = document.getElementById('activity-feed');
  if (!container) return;
  container.innerHTML = activities.slice(0, 10).map(a => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div class="activity-content">
        <p>${a.description}</p>
        <small>${timeAgo(a.created_at)}</small>
      </div>
    </div>
  `).join('') || '<p class="no-data">·« ÌÊÃœ ‰‘«ÿ</p>';
}

function renderWeeklySalesChart(data) {
  const canvas = document.getElementById('sales-chart');
  if (!canvas) return;
  /* —”„ »”Ìÿ »œÊ‰ „ﬂ »… */
  const ctx = canvas.getContext('2d');
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const w = canvas.width, h = canvas.height;
  const padding = 40;
  const barWidth = (w - padding * 2) / (data.length || 1);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary') || '#1a1d24';
  ctx.fillRect(0, 0, w, h);

  data.forEach((d, i) => {
    const barH = ((d.revenue / maxRevenue) * (h - padding * 2));
    const x = padding + i * barWidth;
    const y = h - padding - barH;

    /* ‘—Ìÿ */
    const gradient = ctx.createLinearGradient(0, y, 0, h - padding);
    gradient.addColorStop(0, '#FF6B00');
    gradient.addColorStop(1, '#FF6B0033');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x + barWidth * 0.15, y, barWidth * 0.7, barH, [4, 4, 0, 0]);
    ctx.fill();

    /* «· «—ÌŒ */
    ctx.fillStyle = '#888';
    ctx.font = '11px Cairo, sans-serif';
    ctx.textAlign = 'center';
    const day = d.day ? new Date(d.day).toLocaleDateString('ar-EG', { weekday: 'short' }) : '';
    ctx.fillText(day, x + barWidth / 2, h - 10);
  });
}

/* ==================== ≈œ«—… «·„‰ Ã«  ==================== */
let adminProductsPage = 1;

async function loadAdminProducts() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;
  container.innerHTML = '<div class="table-loading">Ã«—Ì «· Õ„Ì·...</div>';

  const search = document.getElementById('prod-search')?.value || '';
  const category = document.getElementById('prod-category-filter')?.value || '';
  const status = document.getElementById('prod-status-filter')?.value || '';

  const res = await adminAPI(`/products/admin/all?page=${adminProductsPage}&search=${search}&category_id=${category}&status=${status}`);
  if (!res.success) { container.innerHTML = '<p class="error">ÕœÀ Œÿ√</p>'; return; }

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«·’Ê—…</th><th>«·«”„</th><th>«·ﬁ”„</th><th>«·”⁄—</th><th>«·Õ«·…</th><th>«·ÿ·»« </th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.products.map(p => `
          <tr>
            <td>${p.main_image ? `<img src="${p.main_image}" class="table-img">` : '<div class="no-img-sm">???</div>'}</td>
            <td><strong>${p.name}</strong><br><small>${p.short_description || ''}</small></td>
            <td>${p.category_name || '-'}</td>
            <td>${formatPrice(p.price)}</td>
            <td><span class="badge badge-${getProductStatusClass(p.status)}">${getProductStatusText(p.status)}</span></td>
            <td>${p.orders_count || 0}</td>
            <td class="actions-cell">
              <button class="btn-icon btn-edit" onclick="openEditProduct(${p.id})" title=" ⁄œÌ·"><i class="icon-edit"></i></button>
              <button class="btn-icon btn-toggle" onclick="toggleProductStatus(${p.id}, '${p.status}')" title=" €ÌÌ— «·Õ«·…"><i class="icon-toggle"></i></button>
              <button class="btn-icon btn-delete" onclick="deleteProduct(${p.id}, '${p.name}')" title="Õ–›"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="7" class="no-data">·«  ÊÃœ „‰ Ã« </td></tr>'}
      </tbody>
    </table>
  `;

  renderPagination('admin-products-pagination', adminProductsPage, res.pages, (p) => { adminProductsPage = p; loadAdminProducts(); });
}

function openAddProduct() {
  document.getElementById('product-form-title').textContent = '≈÷«›… „‰ Ã ÃœÌœ';
  document.getElementById('product-form').reset();
  document.getElementById('product-form').dataset.editId = '';
  openModal('product-form-modal');
  loadCategoriesForSelect('product-category-select');
}

async function openEditProduct(id) {
  const res = await adminAPI(`/products/${id}`);
  if (!res.success) { showToast('ÕœÀ Œÿ√ ›Ì «· Õ„Ì·', 'error'); return; }
  const p = res.product;

  document.getElementById('product-form-title').textContent = ' ⁄œÌ· «·„‰ Ã';
  const form = document.getElementById('product-form');
  form.dataset.editId = id;

  const fields = { 'prod-name': p.name, 'prod-name-en': p.name_en, 'prod-short-desc': p.short_description, 'prod-full-desc': p.full_description, 'prod-price': p.price, 'prod-old-price': p.old_price, 'prod-discount': p.discount, 'prod-sort': p.sort_order, 'prod-quantity': p.quantity };
  Object.entries(fields).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val || ''; });

  const statusEl = document.getElementById('prod-status');
  if (statusEl) statusEl.value = p.status;
  const featuredEl = document.getElementById('prod-featured');
  if (featuredEl) featuredEl.checked = p.is_featured;

  await loadCategoriesForSelect('product-category-select', p.category_id);
  openModal('product-form-modal');
}

async function saveProduct(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.dataset.editId;
  const formData = new FormData(form);

  const btn = form.querySelector('[type="submit"]');
  setButtonLoading(btn, true, 'Ã«—Ì «·Õ›Ÿ...');

  const res = editId
    ? await fetch(`${API_BASE}/products/${editId}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${AppState.adminToken}` }, body: formData }).then(r => r.json())
    : await fetch(`${API_BASE}/products`, { method: 'POST', headers: { 'Authorization': `Bearer ${AppState.adminToken}` }, body: formData }).then(r => r.json());

  setButtonLoading(btn, false, 'Õ›Ÿ «·„‰ Ã');

  if (res.success) {
    showToast(editId ? '?  „  ÕœÌÀ «·„‰ Ã' : '?  „ ≈÷«›… «·„‰ Ã', 'success');
    closeModal('product-form-modal');
    loadAdminProducts();
    loadDashboard();
  } else {
    showToast(res.message, 'error');
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Â·  —Ìœ Õ–› "${name}"ø`)) return;
  const res = await adminAPI(`/products/${id}`, { method: 'DELETE' });
  if (res.success) { showToast('?  „ «·Õ–›', 'success'); loadAdminProducts(); }
  else showToast(res.message, 'error');
}

async function toggleProductStatus(id, currentStatus) {
  const statuses = ['available', 'unavailable', 'out_of_stock', 'hidden'];
  const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
  const res = await adminAPI(`/products/${id}`, { method: 'PUT', body: { status: nextStatus } });
  if (res.success) { showToast(` „ «· €ÌÌ— ≈·Ï: ${getProductStatusText(nextStatus)}`, 'success'); loadAdminProducts(); }
}

/* ==================== ≈œ«—… «·√ﬁ”«„ ==================== */
async function loadAdminCategories() {
  const container = document.getElementById('admin-categories-list');
  if (!container) return;
  const res = await adminAPI('/products/categories/all');
  if (!res.success) return;

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«·’Ê—…</th><th>«·«”„</th><th>«·„‰ Ã« </th><th>«·Õ«·…</th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.categories.map(c => `
          <tr>
            <td>${c.image ? `<img src="${c.image}" class="table-img">` : '<div class="no-img-sm">??</div>'}</td>
            <td><strong>${c.name}</strong></td>
            <td>${c.products_count || 0}</td>
            <td><span class="badge badge-${c.status === 'active' ? 'success' : 'danger'}">${c.status === 'active' ? '‰‘ÿ' : '„Œ›Ì'}</span></td>
            <td class="actions-cell">
              <button class="btn-icon btn-edit" onclick="openEditCategory(${c.id})"><i class="icon-edit"></i></button>
              <button class="btn-icon btn-delete" onclick="deleteCategory(${c.id}, '${c.name}')"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="5" class="no-data">·«  ÊÃœ √ﬁ”«„</td></tr>'}
      </tbody>
    </table>
  `;
}

async function saveCategory(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.dataset.editId;
  const formData = new FormData(form);
  const url = editId ? `/products/categories/${editId}` : '/products/categories';
  const method = editId ? 'PUT' : 'POST';
  const res = await fetch(`${API_BASE}${url}`, { method, headers: { 'Authorization': `Bearer ${AppState.adminToken}` }, body: formData }).then(r => r.json());
  if (res.success) { showToast(editId ? ' „ «· ÕœÌÀ' : ' „ «·≈÷«›…', 'success'); closeModal('category-form-modal'); loadAdminCategories(); }
  else showToast(res.message, 'error');
}

async function deleteCategory(id, name) {
  if (!confirm(`Õ–› ﬁ”„ "${name}"ø ”Ì „ ≈·€«¡ «— »«ÿ „‰ Ã« Â.`)) return;
  const res = await adminAPI(`/products/categories/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadAdminCategories(); }
}

async function loadCategoriesForSelect(selectId, selectedId = null) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const res = await adminAPI('/products/categories/all');
  if (!res.success) return;
  select.innerHTML = '<option value="">«Œ — «·ﬁ”„</option>' + res.categories.map(c => `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${c.name}</option>`).join('');
}

/* ==================== ≈œ«—… «·ÿ·»«  ==================== */
let adminOrdersPage = 1;

async function loadAdminOrders() {
  const container = document.getElementById('admin-orders-list');
  if (!container) return;
  container.innerHTML = '<div class="table-loading">Ã«—Ì «· Õ„Ì·...</div>';

  const status = document.getElementById('order-status-filter')?.value || '';
  const search = document.getElementById('order-search')?.value || '';

  const res = await adminAPI(`/orders?page=${adminOrdersPage}&status=${status}&search=${search}`);
  if (!res.success) return;

  /* ≈Õ’«∆Ì«  ”—Ì⁄… */
  const statuses = ['pending', 'processing', 'ready', 'completed', 'rejected', 'cancelled'];
  const statusCounts = statuses.map(s => ({
    status: s,
    count: res.orders.filter(o => o.status === s).length
  }));

  container.innerHTML = `
    <div class="orders-stats-bar">
      ${statuses.map(s => `<span class="status-pill ${s}" onclick="filterOrdersByStatus('${s}')">${getOrderStatusText(s)}</span>`).join('')}
    </div>
    <table class="admin-table">
      <thead><tr><th>—ﬁ„ «·ÿ·»</th><th>«·⁄„Ì·</th><th>«·„‰ Ã« </th><th>«·≈Ã„«·Ì</th><th>«·œ›⁄</th><th>«·Õ«·…</th><th>«· «—ÌŒ</th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.orders.map(o => `
          <tr>
            <td><strong class="order-num" onclick="openOrderDetail(${o.id})">${o.order_number}</strong></td>
            <td>${o.customer_name}<br><small>${o.customer_phone || ''}</small></td>
            <td><button class="btn-link" onclick="openOrderDetail(${o.id})">⁄—÷ «· ›«’Ì·</button></td>
            <td>${formatPrice(o.total)}</td>
            <td>${o.payment_name || '-'} ${o.payment_proof ? '<span class="proof-badge">??</span>' : ''}</td>
            <td>
              <select class="status-select status-${o.status}" onchange="updateOrderStatus(${o.id}, this.value)">
                ${['pending','processing','ready','completed','rejected','cancelled'].map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${getOrderStatusText(s)}</option>`).join('')}
              </select>
            </td>
            <td>${formatDateTime(o.created_at)}</td>
            <td class="actions-cell">
              <button class="btn-icon" onclick="openOrderDetail(${o.id})" title=" ›«’Ì·"><i class="icon-eye"></i></button>
              <button class="btn-icon btn-delete" onclick="deleteOrder(${o.id})" title="Õ–›"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="8" class="no-data">·«  ÊÃœ ÿ·»« </td></tr>'}
      </tbody>
    </table>
  `;

  renderPagination('admin-orders-pagination', adminOrdersPage, res.pages, (p) => { adminOrdersPage = p; loadAdminOrders(); });
}

async function openOrderDetail(id) {
  openModal('order-detail-modal');
  const body = document.getElementById('order-detail-body');
  if (body) body.innerHTML = '<div class="loading-spinner"></div>';

  const res = await adminAPI(`/orders/${id}`);
  if (!res.success) { if (body) body.innerHTML = '<p>ÕœÀ Œÿ√</p>'; return; }
  const o = res.order;

  if (body) {
    body.innerHTML = `
      <div class="order-detail-header">
        <div><h3>ÿ·»: ${o.order_number}</h3><p>${formatDateTime(o.created_at)}</p></div>
        <span class="badge badge-${getOrderStatusClass(o.status)}">${getOrderStatusText(o.status)}</span>
      </div>
      <div class="order-detail-grid">
        <div class="order-customer-info">
          <h4>»Ì«‰«  «·⁄„Ì·</h4>
          <p><strong>«·«”„:</strong> ${o.customer_name}</p>
          ${o.customer_phone ? `<p><strong>«·Â« ›:</strong> ${o.customer_phone}</p>` : ''}
          ${o.customer_email ? `<p><strong>«·»—Ìœ:</strong> ${o.customer_email}</p>` : ''}
          ${o.notes ? `<p><strong>„·«ÕŸ«  «·⁄„Ì·:</strong> ${o.notes}</p>` : ''}
        </div>
        <div class="order-payment-info">
          <h4>»Ì«‰«  «·œ›⁄</h4>
          <p><strong>ÿ—Ìﬁ… «·œ›⁄:</strong> ${o.payment_name || '-'}</p>
          ${o.account_name ? `<p><strong>’«Õ» «·Õ”«»:</strong> ${o.account_name}</p>` : ''}
          ${o.account_number ? `<p><strong>—ﬁ„ «·Õ”«»:</strong> ${o.account_number}</p>` : ''}
          ${o.coupon_code ? `<p><strong>ﬂÊ»Ê‰:</strong> ${o.coupon_code}</p>` : ''}
          ${o.payment_proof ? `<p><a href="${o.payment_proof}" target="_blank" class="btn btn-sm btn-outline">?? ≈À»«  «·œ›⁄</a></p>` : ''}
        </div>
      </div>
      <div class="order-items-list">
        <h4>«·„‰ Ã« </h4>
        <table class="items-table">
          <thead><tr><th>«·„‰ Ã</th><th>«·ﬂ„Ì…</th><th>«·”⁄—</th><th>«·≈Ã„«·Ì</th></tr></thead>
          <tbody>
            ${o.items?.map(item => `
              <tr>
                <td>${item.product_image ? `<img src="${item.product_image}" class="table-img">` : ''} ${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>${formatPrice(item.price)}</td>
                <td>${formatPrice(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="order-totals">
          <div class="order-total-row"><span>«·„Ã„Ê⁄ «·›—⁄Ì</span><span>${formatPrice(o.subtotal)}</span></div>
          ${o.discount > 0 ? `<div class="order-total-row discount"><span>«·Œ’„</span><span>-${formatPrice(o.discount)}</span></div>` : ''}
          <div class="order-total-row total"><span>«·≈Ã„«·Ì</span><span>${formatPrice(o.total)}</span></div>
        </div>
      </div>
      <div class="order-actions-panel">
        <div class="form-group">
          <label> ÕœÌÀ «·Õ«·…</label>
          <select id="detail-order-status" class="form-control">
            ${['pending','processing','ready','completed','rejected','cancelled'].map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${getOrderStatusText(s)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>„·«ÕŸ… «·√œ„‰</label>
          <textarea id="detail-admin-notes" class="form-control" rows="2">${o.admin_notes || ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="saveOrderUpdate(${o.id})">Õ›Ÿ «· €ÌÌ—« </button>
      </div>
    `;
  }
}

async function saveOrderUpdate(id) {
  const status = document.getElementById('detail-order-status')?.value;
  const admin_notes = document.getElementById('detail-admin-notes')?.value;
  const res = await adminAPI(`/orders/${id}`, { method: 'PUT', body: { status, admin_notes } });
  if (res.success) { showToast('?  „  ÕœÌÀ «·ÿ·»', 'success'); closeModal('order-detail-modal'); loadAdminOrders(); loadDashboard(); }
  else showToast(res.message, 'error');
}

async function updateOrderStatus(id, status) {
  const res = await adminAPI(`/orders/${id}`, { method: 'PUT', body: { status } });
  if (res.success) showToast(` „  €ÌÌ— «·Õ«·… ≈·Ï: ${getOrderStatusText(status)}`, 'success');
  else showToast(res.message, 'error');
}

async function deleteOrder(id) {
  if (!confirm('Õ–› «·ÿ·» ‰Â«∆Ì«ø')) return;
  const res = await adminAPI(`/orders/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadAdminOrders(); }
}

function filterOrdersByStatus(status) {
  const select = document.getElementById('order-status-filter');
  if (select) { select.value = status; loadAdminOrders(); }
}

/* ==================== ≈œ«—… «·⁄„·«¡ ==================== */
async function loadAdminCustomers() {
  const container = document.getElementById('admin-customers-list');
  if (!container) return;
  const search = document.getElementById('customer-search')?.value || '';
  const res = await adminAPI(`/auth/customers?search=${search}`);
  if (!res.success) return;

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«·’Ê—…</th><th>«·«”„</th><th>«· Ê«’·</th><th>«·ÿ·»« </th><th>«·‰ﬁ«ÿ</th><th>«·Õ«·…</th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.customers.map(c => `
          <tr>
            <td><div class="user-avatar-sm">${c.full_name?.charAt(0) || '„'}</div></td>
            <td><strong>${c.full_name}</strong><br><small>${formatDate(c.created_at)}</small></td>
            <td>${c.email || ''}<br>${c.phone || ''}</td>
            <td>${c.orders_count || 0}</td>
            <td>${c.points || 0}</td>
            <td><span class="badge badge-${c.status === 'active' ? 'success' : c.status === 'blocked' ? 'danger' : 'warning'}">${c.status === 'active' ? '‰‘ÿ' : c.status === 'blocked' ? '„ÕŸÊ—' : '„⁄·ﬁ'}</span></td>
            <td class="actions-cell">
              <button class="btn-icon" onclick="toggleCustomerStatus(${c.id}, '${c.status}')" title="${c.status === 'blocked' ? '≈·€«¡ «·ÕŸ—' : 'ÕŸ—'}"><i class="icon-${c.status === 'blocked' ? 'unlock' : 'lock'}"></i></button>
              <button class="btn-icon btn-delete" onclick="deleteCustomer(${c.id}, '${c.full_name}')"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="7" class="no-data">·« ÌÊÃœ ⁄„·«¡</td></tr>'}
      </tbody>
    </table>
  `;
}

async function toggleCustomerStatus(id, status) {
  const newStatus = status === 'blocked' ? 'active' : 'blocked';
  const res = await adminAPI(`/auth/customers/${id}`, { method: 'PUT', body: { status: newStatus } });
  if (res.success) { showToast(newStatus === 'blocked' ? ' „ ÕŸ— «·⁄„Ì·' : ' „ ≈·€«¡ «·ÕŸ—', 'success'); loadAdminCustomers(); }
}

async function deleteCustomer(id, name) {
  if (!confirm(`Õ–› ⁄„Ì· "${name}"ø`)) return;
  const res = await adminAPI(`/auth/customers/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadAdminCustomers(); }
}

/* ==================== ≈œ«—… «· ⁄·Ìﬁ«  ==================== */
async function loadAdminReviews() {
  const container = document.getElementById('admin-reviews-list');
  if (!container) return;
  const status = document.getElementById('review-status-filter')?.value || '';
  const res = await adminAPI(`/reviews/admin/all?status=${status}`);
  if (!res.success) return;

  /* «·≈Õ’«∆Ì«  */
  if (res.stats) {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('reviews-pending-count', res.stats.pending);
    setEl('reviews-approved-count', res.stats.approved);
    setEl('reviews-rejected-count', res.stats.rejected);
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«·⁄„Ì·</th><th>«·„‰ Ã</th><th>«· ﬁÌÌ„</th><th>«· ⁄·Ìﬁ</th><th>«·Õ«·…</th><th>«· «—ÌŒ</th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.reviews.map(r => `
          <tr>
            <td><strong>${r.customer_name}</strong></td>
            <td>${r.product_name || '-'}</td>
            <td>${'?'.repeat(r.rating)}</td>
            <td class="review-text-cell">${r.review}</td>
            <td><span class="badge badge-${getReviewStatusClass(r.status)}">${getReviewStatusText(r.status)}</span></td>
            <td>${timeAgo(r.created_at)}</td>
            <td class="actions-cell">
              ${r.status !== 'approved' ? `<button class="btn-icon btn-success" onclick="updateReview(${r.id}, 'approved')" title="ﬁ»Ê·"><i class="icon-check"></i></button>` : ''}
              ${r.status !== 'rejected' ? `<button class="btn-icon btn-warning" onclick="updateReview(${r.id}, 'rejected')" title="—›÷"><i class="icon-x"></i></button>` : ''}
              <button class="btn-icon btn-delete" onclick="deleteReview(${r.id})" title="Õ–›"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="7" class="no-data">·«  ÊÃœ  ⁄·Ìﬁ« </td></tr>'}
      </tbody>
    </table>
  `;
}

async function updateReview(id, status) {
  const res = await adminAPI(`/reviews/${id}`, { method: 'PUT', body: { status } });
  if (res.success) { showToast(status === 'approved' ? '?  „ ﬁ»Ê· «· ⁄·Ìﬁ' : '?  „ —›÷ «· ⁄·Ìﬁ', 'success'); loadAdminReviews(); }
}

async function deleteReview(id) {
  if (!confirm('Õ–› «· ⁄·Ìﬁø')) return;
  const res = await adminAPI(`/reviews/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadAdminReviews(); }
}

/* ==================== ≈œ«—… «·≈‘⁄«—«  ==================== */
async function loadAdminNotifications() {
  const container = document.getElementById('admin-notifications-list');
  if (!container) return;
  const res = await adminAPI('/notifications/admin/all');
  if (!res.success) return;

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«·⁄‰Ê«‰</th><th>«·Ê’›</th><th>«·‰Ê⁄</th><th>«·Õ«·…</th><th>«· «—ÌŒ</th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.notifications.map(n => `
          <tr>
            <td>${n.image ? `<img src="${n.image}" class="table-img">` : ''}<strong>${n.title}</strong></td>
            <td>${n.description || '-'}</td>
            <td>${n.type === 'text' ? '‰’' : n.type === 'image' ? '’Ê—…' : '‰’ Ê’Ê—…'}</td>
            <td><span class="badge badge-${n.status === 'active' ? 'success' : 'danger'}">${n.status === 'active' ? '‰‘ÿ' : '„Œ›Ì'}</span></td>
            <td>${timeAgo(n.created_at)}</td>
            <td class="actions-cell">
              <button class="btn-icon btn-delete" onclick="deleteNotification(${n.id})"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="6" class="no-data">·«  ÊÃœ ≈‘⁄«—« </td></tr>'}
      </tbody>
    </table>
  `;
}

async function sendNotification(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const res = await fetch(`${API_BASE}/notifications`, { method: 'POST', headers: { 'Authorization': `Bearer ${AppState.adminToken}` }, body: formData }).then(r => r.json());
  if (res.success) { showToast('?  „ ≈—”«· «·≈‘⁄«—', 'success'); closeModal('notification-form-modal'); loadAdminNotifications(); form.reset(); }
  else showToast(res.message, 'error');
}

async function deleteNotification(id) {
  if (!confirm('Õ–› «·≈‘⁄«—ø')) return;
  const res = await adminAPI(`/notifications/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadAdminNotifications(); }
}

/* ==================== ≈œ«—… ÿ—ﬁ «·œ›⁄ ==================== */
async function loadAdminPayments() {
  const container = document.getElementById('admin-payments-list');
  if (!container) return;
  const res = await adminAPI('/payments/admin/all');
  if (!res.success) return;

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«·’Ê—…</th><th>«·«”„</th><th>«·Õ”«»</th><th>«·—ﬁ„</th><th>«·Õ«·…</th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.payment_methods.map(pm => `
          <tr>
            <td>${pm.image ? `<img src="${pm.image}" class="table-img">` : '<div class="no-img-sm">??</div>'}</td>
            <td><strong>${pm.name}</strong></td>
            <td>${pm.account_name || '-'}</td>
            <td>${pm.account_number || '-'}</td>
            <td>
              <label class="toggle-switch">
                <input type="checkbox" ${pm.status === 'active' ? 'checked' : ''} onchange="togglePaymentMethod(${pm.id})">
                <span class="toggle-slider"></span>
              </label>
            </td>
            <td class="actions-cell">
              <button class="btn-icon btn-edit" onclick="openEditPayment(${pm.id})"><i class="icon-edit"></i></button>
              <button class="btn-icon btn-delete" onclick="deletePaymentMethod(${pm.id})"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="6" class="no-data">·«  ÊÃœ ÿ—ﬁ œ›⁄</td></tr>'}
      </tbody>
    </table>
  `;
}

async function togglePaymentMethod(id) {
  const res = await adminAPI(`/payments/admin/${id}/toggle`, { method: 'PATCH' });
  if (res.success) showToast(` „ ${res.status === 'active' ? '«· ›⁄Ì·' : '«· ⁄ÿÌ·'}`, 'success');
}

async function savePayment(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.dataset.editId;
  const formData = new FormData(form);
  const url = editId ? `/payments/admin/${editId}` : '/payments/admin/add';
  const method = editId ? 'PUT' : 'POST';
  const res = await fetch(`${API_BASE}${url}`, { method, headers: { 'Authorization': `Bearer ${AppState.adminToken}` }, body: formData }).then(r => r.json());
  if (res.success) { showToast(' „ «·Õ›Ÿ', 'success'); closeModal('payment-form-modal'); loadAdminPayments(); form.reset(); }
  else showToast(res.message, 'error');
}

async function deletePaymentMethod(id) {
  if (!confirm('Õ–› ÿ—Ìﬁ… «·œ›⁄ø')) return;
  const res = await adminAPI(`/payments/admin/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadAdminPayments(); }
}

/* ==================== «·≈⁄œ«œ«  ==================== */
async function loadAdminSettings() {
  const res = await adminAPI('/auth/settings');
  if (!res.success) return;
  const s = res.settings;

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('set-store-name',        s.store_name);
  setVal('set-store-desc',        s.store_description);
  setVal('set-email',             s.email);
  setVal('set-phone',             s.phone);
  setVal('set-address',           s.address);
  setVal('set-whatsapp',          s.whatsapp);
  setVal('set-telegram',          s.telegram);
  setVal('set-facebook',          s.facebook);
  setVal('set-instagram',         s.instagram);
  setVal('set-tiktok',            s.tiktok);
  setVal('set-minimum-order',     s.minimum_order);
  setVal('set-theme-color',       s.theme_color || '#FF6B00');
  setVal('set-meta-title',        s.meta_title);
  setVal('set-meta-desc',         s.meta_description);
  setVal('set-meta-keywords',     s.meta_keywords);
  setVal('set-maintenance-msg',   s.maintenance_message);
  setVal('set-developer-name',    s.developer_name);
  setVal('set-developer-wa',      s.developer_whatsapp);
  setVal('set-points-per-order',  s.points_per_order);
  setVal('set-points-value',      s.points_value);

  const maintenance = document.getElementById('set-maintenance-mode');
  if (maintenance) maintenance.checked = s.maintenance_mode == 1;

  if (s.store_logo) {
    const preview = document.getElementById('logo-preview');
    if (preview) { preview.src = s.store_logo; preview.style.display = ''; }
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const maintenance = document.getElementById('set-maintenance-mode')?.checked ? 1 : 0;
  formData.set('maintenance_mode', maintenance);

  const btn = form.querySelector('[type="submit"]');
  setButtonLoading(btn, true, 'Ã«—Ì «·Õ›Ÿ...');

  const res = await fetch(`${API_BASE}/auth/settings`, { method: 'PUT', headers: { 'Authorization': `Bearer ${AppState.adminToken}` }, body: formData }).then(r => r.json());
  setButtonLoading(btn, false, 'Õ›Ÿ «·≈⁄œ«œ« ');

  if (res.success) { showToast('?  „ Õ›Ÿ «·≈⁄œ«œ« ', 'success'); await loadSettings(); applySettings(AppState.settings); }
  else showToast(res.message, 'error');
}

/* ==================== «· Õ·Ì·«  ==================== */
async function loadAdminAnalytics() {
  const period = document.getElementById('analytics-period')?.value || '30';
  const res = await adminAPI(`/auth/analytics?period=${period}`);
  if (!res.success) return;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('analytics-customers-total', res.customerStats?.total?.toLocaleString('ar'));
  setEl('analytics-new-customers',   res.customerStats?.new_this_month?.toLocaleString('ar'));
  setEl('analytics-avg-order',       formatPrice(res.orderStats?.avg_value || 0));

  /* √ﬂÀ— «·„‰ Ã«  */
  const topProdsContainer = document.getElementById('analytics-top-products');
  if (topProdsContainer) {
    topProdsContainer.innerHTML = res.topProducts?.map((p, i) => `
      <div class="analytics-item">
        <span class="rank">${i + 1}</span>
        <span class="item-name">${p.name}</span>
        <span class="item-count">${p.sold} „»Ì⁄</span>
        <span class="item-revenue">${formatPrice(p.revenue || 0)}</span>
      </div>
    `).join('') || '<p class="no-data">·« »Ì«‰« </p>';
  }
}

/* ==================== ”Ã· «·‰‘«ÿ ==================== */
async function loadActivityLog() {
  const container = document.getElementById('activity-log-list');
  if (!container) return;
  const res = await adminAPI('/auth/activity-logs');
  if (!res.success) return;

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«·≈Ã—«¡</th><th>«·Ê’›</th><th>«·„œÌ—</th><th>«·Êﬁ </th></tr></thead>
      <tbody>
        ${res.logs.map(l => `
          <tr>
            <td><span class="activity-action">${l.action}</span></td>
            <td>${l.description}</td>
            <td>${l.admin_name || '«·‰Ÿ«„'}</td>
            <td>${formatDateTime(l.created_at)}</td>
          </tr>
        `).join('') || '<tr><td colspan="4" class="no-data">·« ÌÊÃœ ‰‘«ÿ</td></tr>'}
      </tbody>
    </table>
  `;
}

/* ==================== «·‰”Œ «·«Õ Ì«ÿÌ… ==================== */
async function loadBackups() {
  const container = document.getElementById('backups-list');
  if (!container) return;
  const res = await adminAPI('/auth/backups');
  if (!res.success) return;

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«”„ «·„·›</th><th>«·ÕÃ„</th><th>«· «—ÌŒ</th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.backups.map(b => `
          <tr>
            <td><i class="icon-archive"></i> ${b.file_name}</td>
            <td>${formatFileSize(b.file_size)}</td>
            <td>${formatDateTime(b.created_at)}</td>
            <td class="actions-cell">
              <a href="/api/auth/backups/${b.file_name}/download" class="btn-icon" title=" Õ„Ì·"><i class="icon-download"></i></a>
              <button class="btn-icon btn-delete" onclick="deleteBackup('${b.file_name}')" title="Õ–›"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="4" class="no-data">·«  ÊÃœ ‰”Œ «Õ Ì«ÿÌ…</td></tr>'}
      </tbody>
    </table>
  `;
}

async function createBackup() {
  const btn = document.getElementById('create-backup-btn');
  setButtonLoading(btn, true, 'Ã«—Ì «·≈‰‘«¡...');
  const res = await adminAPI('/auth/backups/create', { method: 'POST' });
  setButtonLoading(btn, false, '≈‰‘«¡ ‰”Œ… «Õ Ì«ÿÌ…');
  if (res.success) { showToast('? ' + res.message, 'success'); loadBackups(); }
  else showToast(res.message, 'error');
}

async function deleteBackup(filename) {
  if (!confirm('Õ–› «·‰”Œ… «·«Õ Ì«ÿÌ…ø')) return;
  const res = await adminAPI(`/auth/backups/${filename}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadBackups(); }
}

/* ==================== «·»‰—«  ==================== */
async function loadAdminBanners() {
  const container = document.getElementById('admin-banners-list');
  if (!container) return;
  const res = await adminAPI('/products/banners/all');
  if (!res.success) return;

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«·’Ê—…</th><th>«·⁄‰Ê«‰</th><th>«·Õ«·…</th><th>«· — Ì»</th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.banners.map(b => `
          <tr>
            <td>${b.image ? `<img src="${b.image}" class="table-img">` : '<div class="no-img-sm">???</div>'}</td>
            <td><strong>${b.title}</strong><br><small>${b.description || ''}</small></td>
            <td><span class="badge badge-${b.status === 'active' ? 'success' : 'danger'}">${b.status === 'active' ? '‰‘ÿ' : '„Œ›Ì'}</span></td>
            <td>${b.sort_order}</td>
            <td class="actions-cell">
              <button class="btn-icon btn-edit" onclick="openEditBanner(${b.id})"><i class="icon-edit"></i></button>
              <button class="btn-icon btn-delete" onclick="deleteBanner(${b.id})"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="5" class="no-data">·«  ÊÃœ »‰—« </td></tr>'}
      </tbody>
    </table>
  `;
}

async function saveBanner(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.dataset.editId;
  const formData = new FormData(form);
  const url = editId ? `/products/banners/${editId}` : '/products/banners';
  const method = editId ? 'PUT' : 'POST';
  const res = await fetch(`${API_BASE}${url}`, { method, headers: { 'Authorization': `Bearer ${AppState.adminToken}` }, body: formData }).then(r => r.json());
  if (res.success) { showToast(' „ «·Õ›Ÿ', 'success'); closeModal('banner-form-modal'); loadAdminBanners(); form.reset(); }
  else showToast(res.message, 'error');
}

async function deleteBanner(id) {
  if (!confirm('Õ–› «·»‰—ø')) return;
  const res = await adminAPI(`/products/banners/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadAdminBanners(); }
}

/* ==================== «·ﬂÊ»Ê‰«  ==================== */
async function loadAdminCoupons() {
  const container = document.getElementById('admin-coupons-list');
  if (!container) return;
  const res = await adminAPI('/auth/coupons');
  if (!res.success) return;

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«·ﬂÊœ</th><th>«·‰Ê⁄</th><th>«·ﬁÌ„…</th><th>«·«” Œœ«„</th><th>«·Õœ «·√œ‰Ï</th><th>«·«‰ Â«¡</th><th>«·Õ«·…</th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.coupons.map(c => `
          <tr>
            <td><code class="coupon-code">${c.code}</code></td>
            <td>${c.type === 'percentage' ? '‰”»… „∆ÊÌ…' : 'Œ’„ À«» '}</td>
            <td>${c.type === 'percentage' ? `${c.value}%` : formatPrice(c.value)}</td>
            <td>${c.used_count}${c.usage_limit > 0 ? '/' + c.usage_limit : ''}</td>
            <td>${c.minimum_order > 0 ? formatPrice(c.minimum_order) : '-'}</td>
            <td>${c.end_date ? formatDate(c.end_date) : '-'}</td>
            <td><span class="badge badge-${c.status === 'active' ? 'success' : 'danger'}">${c.status === 'active' ? '‰‘ÿ' : '„⁄ÿ·'}</span></td>
            <td class="actions-cell">
              <button class="btn-icon btn-toggle" onclick="toggleCoupon(${c.id}, '${c.status}')"><i class="icon-toggle"></i></button>
              <button class="btn-icon btn-delete" onclick="deleteCoupon(${c.id})"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="8" class="no-data">·«  ÊÃœ ﬂÊ»Ê‰« </td></tr>'}
      </tbody>
    </table>
  `;
}

async function saveCoupon(e) {
  e.preventDefault();
  const form = e.target;
  const body = Object.fromEntries(new FormData(form).entries());
  const res = await adminAPI('/auth/coupons', { method: 'POST', body });
  if (res.success) { showToast('?  „ ≈÷«›… «·ﬂÊ»Ê‰', 'success'); closeModal('coupon-form-modal'); loadAdminCoupons(); form.reset(); }
  else showToast(res.message, 'error');
}

async function toggleCoupon(id, status) {
  const newStatus = status === 'active' ? 'inactive' : 'active';
  const res = await adminAPI(`/auth/coupons/${id}`, { method: 'PUT', body: { status: newStatus } });
  if (res.success) loadAdminCoupons();
}

async function deleteCoupon(id) {
  if (!confirm('Õ–› «·ﬂÊ»Ê‰ø')) return;
  const res = await adminAPI(`/auth/coupons/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadAdminCoupons(); }
}

/* ==================== «·√”∆·… «·‘«∆⁄… ==================== */
async function loadAdminFaq() {
  const container = document.getElementById('admin-faq-list');
  if (!container) return;
  const res = await adminAPI('/auth/faq');
  if (!res.success) return;

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>«·”ƒ«·</th><th>«·≈Ã«»…</th><th>«· ’‰Ì›</th><th>«·≈Ã—«¡« </th></tr></thead>
      <tbody>
        ${res.faqs.map(f => `
          <tr>
            <td>${f.question}</td>
            <td>${f.answer.substring(0, 60)}...</td>
            <td>${f.category}</td>
            <td class="actions-cell">
              <button class="btn-icon btn-delete" onclick="deleteFaqItem(${f.id})"><i class="icon-trash"></i></button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="4" class="no-data">·«  ÊÃœ √”∆·…</td></tr>'}
      </tbody>
    </table>
  `;
}

async function saveFaq(e) {
  e.preventDefault();
  const form = e.target;
  const body = Object.fromEntries(new FormData(form).entries());
  const res = await adminAPI('/auth/faq', { method: 'POST', body });
  if (res.success) { showToast(' „ «·≈÷«›…', 'success'); closeModal('faq-form-modal'); loadAdminFaq(); form.reset(); }
  else showToast(res.message, 'error');
}

async function deleteFaqItem(id) {
  if (!confirm('Õ–› «·”ƒ«·ø')) return;
  const res = await adminAPI(`/auth/faq/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadAdminFaq(); }
}

/* ==================== «·’›Õ«  ==================== */
async function loadAdminPages() {
  const res = await adminAPI('/auth/pages');
  if (!res.success) return;
  const pages = res.pages;
  const container = document.getElementById('admin-pages-list');
  if (!container) return;
  container.innerHTML = pages.map(p => `
    <div class="page-item" onclick="openEditPage('${p.slug}')">
      <span>${p.title}</span>
      <button class="btn btn-sm btn-outline"><i class="icon-edit"></i>  ⁄œÌ·</button>
    </div>
  `).join('');
}

async function openEditPage(slug) {
  const res = await adminAPI(`/auth/pages/${slug}`);
  if (!res.success) return;
  const page = res.page;
  document.getElementById('page-edit-title').value = page.title;
  document.getElementById('page-edit-content').value = page.content;
  document.getElementById('page-edit-seo-title').value = page.seo_title;
  document.getElementById('page-edit-form').dataset.slug = slug;
  openModal('page-edit-modal');
}

async function savePage(e) {
  e.preventDefault();
  const form = e.target;
  const slug = form.dataset.slug;
  const body = { title: document.getElementById('page-edit-title').value, content: document.getElementById('page-edit-content').value, seo_title: document.getElementById('page-edit-seo-title').value };
  const res = await adminAPI(`/auth/pages/${slug}`, { method: 'PUT', body });
  if (res.success) { showToast('?  „ «·Õ›Ÿ', 'success'); closeModal('page-edit-modal'); }
  else showToast(res.message, 'error');
}

/* ==================== «·⁄„·«  Ê«··€«  ==================== */
async function loadAdminCurrencies() {
  const container = document.getElementById('admin-currencies-list');
  if (!container) return;
  const res = await adminAPI('/auth/currencies/all');
  if (!res.success) return;
  container.innerHTML = res.currencies.map(c => `
    <div class="currency-item">
      <span><strong>${c.code}</strong> - ${c.name} (${c.symbol})</span>
      <span>”⁄— «·’—›: ${c.exchange_rate}</span>
      <span class="badge badge-${c.status === 'active' ? 'success' : 'danger'}">${c.status === 'active' ? '‰‘ÿ' : '„⁄ÿ·'}</span>
      <div class="actions-cell">
        <button class="btn-icon btn-delete" onclick="deleteCurrency(${c.id})"><i class="icon-trash"></i></button>
      </div>
    </div>
  `).join('');
}

async function loadAdminLanguages() {
  const container = document.getElementById('admin-languages-list');
  if (!container) return;
  const res = await adminAPI('/auth/languages/all');
  if (!res.success) return;
  container.innerHTML = res.languages.map(l => `
    <div class="lang-item">
      <span>${l.flag} <strong>${l.name}</strong> (${l.code})</span>
      <span>${l.direction === 'rtl' ? 'Ì„Ì‰ ··Ì”«—' : 'Ì”«— ··Ì„Ì‰'}</span>
      <span class="badge badge-${l.status === 'active' ? 'success' : 'danger'}">${l.status === 'active' ? '‰‘ÿ…' : '„⁄ÿ·…'}</span>
    </div>
  `).join('');
}

async function deleteCurrency(id) {
  if (!confirm('Õ–› «·⁄„·…ø')) return;
  const res = await adminAPI(`/auth/currencies/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(' „ «·Õ–›', 'success'); loadAdminCurrencies(); }
}

/* ==================== œÊ«· „”«⁄œ… ==================== */
function getOrderStatusClass(status) {
  const map = { pending: 'warning', processing: 'info', ready: 'primary', completed: 'success', rejected: 'danger', cancelled: 'secondary' };
  return map[status] || 'secondary';
}
function getOrderStatusText(status) {
  const map = { pending: 'ﬁÌœ «·„—«Ã⁄…', processing: 'Ã«—Ì «· ‰›Ì–', ready: 'Ã«Â“', completed: '„ﬂ „·', rejected: '„—›Ê÷', cancelled: '„·€Ì' };
  return map[status] || status;
}
function getProductStatusClass(status) {
  const map = { available: 'success', unavailable: 'secondary', out_of_stock: 'warning', hidden: 'danger' };
  return map[status] || 'secondary';
}
function getProductStatusText(status) {
  const map = { available: '„ Ê›—', unavailable: '€Ì— „ Ê›—', out_of_stock: '‰›–  «·ﬂ„Ì…', hidden: '„Œ›Ì' };
  return map[status] || status;
}
function getReviewStatusClass(status) {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger', archived: 'secondary' };
  return map[status] || 'secondary';
}
function getReviewStatusText(status) {
  const map = { pending: 'ﬁÌœ «·„—«Ã⁄…', approved: '„ﬁ»Ê·', rejected: '„—›Ê÷', archived: '„ƒ—‘›' };
  return map[status] || status;
}
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
