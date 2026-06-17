/* ================================================
   search.js - ‰Ÿ«„ «·»ÕÀ «·„ ﬁœ„
   Ì‘„·: «·»ÕÀ «·›Ê—Ì (Live Search)° «·›·« —
   ================================================ */

let searchTimeout = null;
let lastSearchQuery = '';

/* ====================  ÂÌ∆… «·»ÕÀ ==================== */
function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);

    if (!query) {
      hideSearchResults();
      return;
    }

    /* »ÕÀ ›Ê—Ì »⁄œ 300 „··Ì À«‰Ì… */
    searchTimeout = setTimeout(() => {
      if (query !== lastSearchQuery) {
        lastSearchQuery = query;
        performSearch(query);
      }
    }, 300);
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      document.getElementById('search-results-dropdown')?.classList.add('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) hideSearchResults();
  });
}

/* ====================  ‰›Ì– «·»ÕÀ ==================== */
async function performSearch(query) {
  const dropdown = document.getElementById('search-results-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = '<div class="search-loading">Ã«—Ì «·»ÕÀ...</div>';
  dropdown.classList.add('active');

  const res = await apiRequest(`/products/search?q=${encodeURIComponent(query)}`);

  if (!res.success) {
    dropdown.innerHTML = '<div class="search-error">ÕœÀ Œÿ√ ›Ì «·»ÕÀ</div>';
    return;
  }

  if (!res.products?.length && !res.categories?.length) {
    dropdown.innerHTML = `<div class="search-empty"><i class="icon-search"></i> ·«  ÊÃœ ‰ «∆Ã ·‹ "${query}"</div>`;
    return;
  }

  let html = '';

  if (res.categories?.length) {
    html += `<div class="search-group-title">«·√ﬁ”«„</div>`;
    html += res.categories.map(c => `
      <div class="search-result-item" onclick="filterByCategory(${c.id}); hideSearchResults();">
        <div class="search-result-icon">??</div>
        <div class="search-result-info">
          <strong>${highlightText(c.name, query)}</strong>
          <small>${c.products_count || 0} „‰ Ã</small>
        </div>
      </div>
    `).join('');
  }

  if (res.products?.length) {
    html += `<div class="search-group-title">«·„‰ Ã« </div>`;
    html += res.products.slice(0, 6).map(p => `
      <div class="search-result-item" onclick="openProductModal(${p.id}); hideSearchResults();">
        <div class="search-result-img">
          ${p.main_image ? `<img src="${p.main_image}" alt="${p.name}">` : '<span>???</span>'}
        </div>
        <div class="search-result-info">
          <strong>${highlightText(p.name, query)}</strong>
          <small>${formatPrice(p.price)}</small>
        </div>
        <span class="badge badge-${getProductStatusClass(p.status)}">${getProductStatusText(p.status)}</span>
      </div>
    `).join('');

    if (res.products.length > 6) {
      html += `<div class="search-see-all" onclick="openFullSearch('${query}'); hideSearchResults();">⁄—÷ Ã„Ì⁄ «·‰ «∆Ã (${res.products.length})</div>`;
    }
  }

  dropdown.innerHTML = html;
}

/* ==================== › Õ «·»ÕÀ «·ﬂ«„· ==================== */
function openFullSearch(query = '') {
  openModal('search-modal');
  const input = document.getElementById('modal-search-input');
  if (input) {
    input.value = query;
    if (query) performFullSearch(query);
  }
}

async function performFullSearch(query) {
  const container = document.getElementById('search-results-full');
  if (!container) return;
  renderSkeleton(container, 6, 'product');

  const res = await apiRequest(`/products/search?q=${encodeURIComponent(query)}&limit=50`);
  if (!res.success || !res.products?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">??</div>
        <h3>·«  ÊÃœ ‰ «∆Ã</h3>
        <p>·„ ‰Ãœ „‰ Ã«  „ÿ«»ﬁ… ·‹ "${query}"</p>
      </div>`;
    return;
  }

  container.innerHTML = res.products.map(p => renderProductCard(p)).join('');
}

/* ==================== œÊ«· „”«⁄œ… ==================== */
function hideSearchResults() {
  document.getElementById('search-results-dropdown')?.classList.remove('active');
}

function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/*  ÂÌ∆… «·»ÕÀ ⁄‰œ  Õ„Ì· «·’›Õ… */
document.addEventListener('DOMContentLoaded', initSearch);
