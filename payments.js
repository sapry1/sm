/* ================================================
   payments.js - äÙÇã ÇáÏÝÚ
   íÔãá: ÚÑÖ ØÑÞ ÇáÏÝÚ¡ ÊÍÞÞ ÇáßæÈæä¡ ÇáÜ Checkout
   ================================================ */

/* ==================== ÇáßæÈæä Ýí ÇáÓáÉ ==================== */
async function applyCouponCode() {
  const code = document.getElementById('coupon-input')?.value?.trim();
  if (!code) { showToast('ÃÏÎá ßæÏ ÇáÎÕã', 'warning'); return; }

  const subtotal = getCartTotal();
  const res = await apiRequest('/auth/coupons/validate', { method: 'POST', body: { code, subtotal } });

  if (res.success) {
    checkoutCoupon = { code, discount: res.discount };
    AppState.cartDiscount = res.discount;
    showToast(`? ÎÕã ${formatPrice(res.discount)} Êã ÊØÈíÞå!`, 'success');
    updateCartSummary(subtotal, res.discount, 0);
  } else {
    showToast(res.message, 'error');
    checkoutCoupon = null;
    AppState.cartDiscount = 0;
  }
}

function removeCoupon() {
  checkoutCoupon = null;
  AppState.cartDiscount = 0;
  const input = document.getElementById('coupon-input');
  if (input) input.value = '';
  updateCartSummary(getCartTotal(), 0, 0);
  showToast('Êã ÅÒÇáÉ ÇáßæÈæä', 'info');
}

/* ==================== ÊÛííÑ ÇáÚãáÉ ==================== */
function changeCurrency(code) {
  setCurrency(code);
  /* ÅÚÇÏÉ ÚÑÖ ÌãíÚ ÇáÃÓÚÇÑ */
  document.querySelectorAll('.product-price').forEach(el => {
    const base = parseFloat(el.dataset.price);
    if (!isNaN(base)) el.textContent = formatPrice(base);
  });
}
