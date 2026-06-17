/* ================================================
   orders.js - äÙÇã ÇáØáÈÇÊ æÇáÏİÚ
   íÔãá: ÅÊãÇã ÇáØáÈ¡ ãÊÇÈÚÉ ÇáØáÈÇÊ¡ ÇáßÇÔíÑ
   ================================================ */

let checkoutPaymentMethod = null;
let checkoutCoupon = null;

/* ==================== ÊÍãíá ØÑíŞÉ ÇáÏİÚ İí ÇáÜ Checkout ==================== */
async function loadPaymentMethods() {
  const container = document.getElementById('payment-methods-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"></div>';

  const res = await apiRequest('/payments');
  if (!res.success || !res.payment_methods?.length) {
    container.innerHTML = '<p class="no-data">áÇ ÊæÌÏ ØÑŞ ÏİÚ ãÊÇÍÉ ÍÇáíÇğ</p>';
    return;
  }

  container.innerHTML = res.payment_methods.map(pm => `
    <div class="payment-method-card" onclick="selectPaymentMethod(${pm.id}, '${pm.name}')" data-id="${pm.id}">
      <div class="pm-radio"></div>
      <div class="pm-icon">
        ${pm.image ? `<img src="${pm.image}" alt="${pm.name}">` : '<i class="icon-wallet"></i>'}
      </div>
      <div class="pm-info">
        <h4>${pm.name}</h4>
        ${pm.description ? `<p>${pm.description}</p>` : ''}
      </div>
    </div>
  `).join('');
}

function selectPaymentMethod(id, name) {
  checkoutPaymentMethod = id;
  document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.payment-method-card[data-id="${id}"]`)?.classList.add('selected');

  /* ÌáÈ ÊİÇÕíá ØÑíŞÉ ÇáÏİÚ */
  loadPaymentDetails(id);
}

async function loadPaymentDetails(id) {
  const detailsContainer = document.getElementById('payment-details-box');
  if (!detailsContainer) return;

  const res = await apiRequest(`/payments/${id}`);
  if (!res.success) return;

  const pm = res.method;
  detailsContainer.style.display = '';
  detailsContainer.innerHTML = `
    <div class="payment-detail-card">
      <h4>ÊÚáíãÇÊ ÇáÏİÚ ÚÈÑ ${pm.name}</h4>
      ${pm.account_name ? `<div class="pay-info-row"><label>ÕÇÍÈ ÇáÍÓÇÈ:</label> <strong>${pm.account_name}</strong></div>` : ''}
      ${pm.account_number ? `<div class="pay-info-row"><label>ÑŞã ÇáÍÓÇÈ/ÇáãÍİÙÉ:</label> <strong class="pay-number">${pm.account_number}</strong> <button class="copy-btn" onclick="copyText('${pm.account_number}')">äÓÎ</button></div>` : ''}
      ${pm.instructions ? `<div class="pay-instructions">${pm.instructions}</div>` : ''}
      <div class="proof-upload-section">
        <label>ÑİÚ ÅËÈÇÊ ÇáÏİÚ (ÇÎÊíÇÑí)</label>
        <input type="file" id="payment-proof-file" accept="image/*,.pdf" class="form-control">
        <small>íãßäß ÑİÚ ÕæÑÉ ÇáÅíÕÇá Ãæ ÑŞã ÇáÚãáíÉ</small>
      </div>
    </div>
  `;
}

/* ==================== ÅÊãÇã ÇáØáÈ ==================== */
async function submitOrder(e) {
  e.preventDefault();
  const form = e.target;

  const cart = getCart();
  if (!cart.length) { showToast('ÇáÓáÉ İÇÑÛÉ!', 'warning'); return; }

  const customer_name = form.querySelector('[name="customer_name"]')?.value?.trim();
  const customer_phone = form.querySelector('[name="customer_phone"]')?.value?.trim();
  const notes = form.querySelector('[name="notes"]')?.value?.trim();

  if (!customer_name) { showToast('ÃÏÎá ÇÓãß', 'warning'); return; }
  if (customer_phone && !validateEgyptianPhone(customer_phone)) { showToast('ÃÏÎá ÑŞã åÇÊİ ãÕÑí ÕÍíÍ', 'warning'); return; }
  if (!checkoutPaymentMethod) { showToast('ÇÎÊÑ ØÑíŞÉ ÇáÏİÚ', 'warning'); return; }

  const formData = new FormData();
  formData.append('customer_name', customer_name);
  formData.append('customer_phone', customer_phone || '');
  formData.append('notes', notes || '');
  formData.append('payment_method_id', checkoutPaymentMethod);
  formData.append('items', JSON.stringify(cart.map(item => ({ product_id: item.id, quantity: item.quantity }))));

  if (checkoutCoupon) {
    formData.append('coupon_code', checkoutCoupon.code);
  }

  /* ÅËÈÇÊ ÇáÏİÚ */
  const proofFile = document.getElementById('payment-proof-file')?.files[0];
  if (proofFile) formData.append('payment_proof', proofFile);

  /* äŞÇØ */
  const usePoints = document.getElementById('use-points')?.checked;
  if (usePoints && AppState.user) {
    const userPoints = AppState.user.points || 0;
    formData.append('points_used', userPoints);
  }

  const btn = form.querySelector('[type="submit"]');
  setButtonLoading(btn, true, 'ÌÇÑí ÅÑÓÇá ÇáØáÈ...');
  showLoading('ÌÇÑí ÅÑÓÇá ØáÈß...');

  const token = AppState.token;
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData
  }).then(r => r.json());

  setButtonLoading(btn, false, 'ÊÃßíÏ ÇáØáÈ');
  hideLoading();

  if (res.success) {
    clearCart();
    checkoutCoupon = null;
    checkoutPaymentMethod = null;
    closeModal('checkout-modal');
    showOrderSuccess(res.order_number, res.total);
  } else {
    showToast(res.message || 'ÍÏË ÎØÃ İí ÅÑÓÇá ÇáØáÈ', 'error');
  }
}

function showOrderSuccess(orderNumber, total) {
  openModal('order-success-modal');
  const el = document.getElementById('success-order-number');
  if (el) el.textContent = orderNumber;
  const totalEl = document.getElementById('success-order-total');
  if (totalEl) totalEl.textContent = formatPrice(total);
}

/* ==================== ØáÈÇÊí ==================== */
async function loadMyOrders() {
  if (!AppState.token) {
    openModal('login-modal');
    return;
  }
  const container = document.getElementById('my-orders-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"></div>';

  const res = await apiRequest('/orders/my-orders');
  if (!res.success) {
    container.innerHTML = '<p class="error">ÍÏË ÎØÃ İí ÇáÊÍãíá</p>';
    return;
  }

  if (!res.orders?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">??</div>
        <h3>áÇ ÊæÌÏ ØáÈÇÊ</h3>
        <p>áã ÊŞÏã Ãí ØáÈÇÊ ÈÚÏ</p>
        <button class="btn btn-primary" onclick="navigateTo('products-section')">ÊÕİÍ Çáãäíæ</button>
      </div>`;
    return;
  }

  container.innerHTML = res.orders.map(o => `
    <div class="order-card" onclick="openMyOrderDetail('${o.order_number}')">
      <div class="order-card-header">
        <div>
          <span class="order-number-badge">${o.order_number}</span>
          <span class="order-date">${formatDateTime(o.created_at)}</span>
        </div>
        <span class="badge badge-${getOrderStatusClass(o.status)}">${getOrderStatusText(o.status)}</span>
      </div>
      <div class="order-card-items">
        ${o.items?.slice(0, 3).map(item => `
          <span class="order-item-chip">
            ${item.product_name} × ${item.quantity}
          </span>
        `).join('')}
        ${o.items?.length > 3 ? `<span class="order-item-chip">+${o.items.length - 3} ÃÎÑì</span>` : ''}
      </div>
      <div class="order-card-footer">
        <span class="order-total">${formatPrice(o.total)}</span>
        <span class="order-payment">${o.payment_name || 'ÛíÑ ãÍÏÏ'}</span>
      </div>
    </div>
  `).join('');
}

async function openMyOrderDetail(orderNumber) {
  openModal('my-order-detail-modal');
  const body = document.getElementById('my-order-detail-body');
  if (body) body.innerHTML = '<div class="loading-spinner"></div>';

  const res = await apiRequest(`/orders/my-orders/${orderNumber}`);
  if (!res.success) { if (body) body.innerHTML = '<p>ÍÏË ÎØÃ</p>'; return; }

  const o = res.order;
  if (body) {
    body.innerHTML = `
      <div class="order-detail-header">
        <div>
          <h3>${o.order_number}</h3>
          <p>${formatDateTime(o.created_at)}</p>
        </div>
        <span class="badge badge-${getOrderStatusClass(o.status)}">${getOrderStatusText(o.status)}</span>
      </div>
      <div class="order-status-timeline">
        ${['pending', 'processing', 'ready', 'completed'].map(s => `
          <div class="timeline-step ${isStatusReached(o.status, s) ? 'done' : ''}">
            <div class="timeline-dot"></div>
            <span>${getOrderStatusText(s)}</span>
          </div>
        `).join('')}
      </div>
      <div class="order-items-list">
        ${o.items?.map(item => `
          <div class="order-item-row">
            ${item.product_image ? `<img src="${item.product_image}" class="order-item-img">` : ''}
            <div class="order-item-info">
              <strong>${item.product_name}</strong>
              <span>× ${item.quantity}</span>
            </div>
            <span class="order-item-price">${formatPrice(item.total)}</span>
          </div>
        `).join('')}
      </div>
      <div class="order-summary">
        <div class="summary-row"><span>ÇáãÌãæÚ</span><span>${formatPrice(o.subtotal)}</span></div>
        ${o.discount > 0 ? `<div class="summary-row discount"><span>ÇáÎÕã</span><span>-${formatPrice(o.discount)}</span></div>` : ''}
        <div class="summary-row total"><span>ÇáÅÌãÇáí</span><span>${formatPrice(o.total)}</span></div>
      </div>
      ${o.account_name ? `
        <div class="payment-info-box">
          <h4>ÊİÇÕíá ÇáÏİÚ</h4>
          <p><strong>ØÑíŞÉ ÇáÏİÚ:</strong> ${o.payment_name}</p>
          <p><strong>ÕÇÍÈ ÇáÍÓÇÈ:</strong> ${o.account_name}</p>
          <p><strong>ÑŞã ÇáÍÓÇÈ:</strong> ${o.account_number}</p>
          ${!o.payment_proof ? `
            <div class="upload-proof">
              <label>ÑİÚ ÅËÈÇÊ ÇáÏİÚ</label>
              <input type="file" id="proof-upload-${o.id}" accept="image/*" class="form-control">
              <button class="btn btn-primary btn-sm" onclick="uploadOrderProof(${o.id})">ÑİÚ ÇáÅíÕÇá</button>
            </div>
          ` : '<p class="proof-uploaded">? Êã ÑİÚ ÅËÈÇÊ ÇáÏİÚ</p>'}
        </div>
      ` : ''}
    `;
  }
}

async function uploadOrderProof(orderId) {
  const file = document.getElementById(`proof-upload-${orderId}`)?.files[0];
  if (!file) { showToast('ÇÎÊÑ ãáİÇğ ÃæáÇğ', 'warning'); return; }

  const formData = new FormData();
  formData.append('proof', file);

  const res = await fetch(`${API_BASE}/payments/proof/${orderId}`, {
    method: 'POST',
    headers: AppState.token ? { 'Authorization': `Bearer ${AppState.token}` } : {},
    body: formData
  }).then(r => r.json());

  if (res.success) showToast('? Êã ÑİÚ ÅËÈÇÊ ÇáÏİÚ', 'success');
  else showToast(res.message, 'error');
}

function isStatusReached(currentStatus, checkStatus) {
  const order = ['pending', 'processing', 'ready', 'completed'];
  return order.indexOf(currentStatus) >= order.indexOf(checkStatus);
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Êã ÇáäÓÎ!', 'success'));
}
