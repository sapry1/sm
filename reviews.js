/* ================================================
   reviews.js - äÙÇã ÇáÊÚáíÞÇÊ æÇáÊÞííãÇÊ
   ================================================ */

/* ==================== äãæÐÌ ÇáÊÚáíÞ ==================== */
function openReviewForm(productId = null) {
  const form = document.getElementById('review-form');
  if (form && productId) {
    const input = form.querySelector('[name="product_id"]');
    if (input) input.value = productId;
  }
  openModal('review-form-modal');
}

/* ==================== ÑÝÚ ÇáÕæÑ Ýí ÇáÊÚáíÞ ==================== */
function initReviewImagePreview() {
  const input = document.getElementById('review-images');
  const preview = document.getElementById('review-images-preview');
  if (!input || !preview) return;

  input.addEventListener('change', () => {
    preview.innerHTML = '';
    Array.from(input.files).slice(0, 5).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'review-preview-img';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });
}

document.addEventListener('DOMContentLoaded', initReviewImagePreview);
