/* ================================================
   auth.js - ‰Ÿ«„ «·Õ”«»«  Ê«·„’«œﬁ…
   Ì‘„·:  ”ÃÌ· «·œŒÊ·° «· ”ÃÌ·° «·„·› «·‘Œ’Ì
   ‰”Ì  ﬂ·„… «·„—Ê—°  €ÌÌ— ﬂ·„… «·„—Ê—
   ================================================ */

/* ====================  ”ÃÌ· œŒÊ· «·„” Œœ„ ==================== */
async function loginUser(e) {
  e.preventDefault();
  const form = e.target;
  const identifier = form.querySelector('[name="identifier"]')?.value?.trim();
  const password = form.querySelector('[name="password"]')?.value;
  const remember = form.querySelector('[name="remember"]')?.checked;

  if (!identifier || !password) {
    showToast('√œŒ· «·»—Ìœ «·≈·ﬂ —Ê‰Ì √Ê —ﬁ„ «·Â« › Êﬂ·„… «·„—Ê—', 'warning');
    return;
  }

  const btn = form.querySelector('[type="submit"]');
  setButtonLoading(btn, true, 'Ã«—Ì  ”ÃÌ· «·œŒÊ·...');

  const res = await apiRequest('/auth/login', { method: 'POST', body: { identifier, password } });

  setButtonLoading(btn, false, ' ”ÃÌ· «·œŒÊ·');

  if (res.success) {
    AppState.token = res.token;
    AppState.user = res.user;
    if (remember) {
      localStorage.setItem('user_token', res.token);
      localStorage.setItem('user_data', JSON.stringify(res.user));
    } else {
      sessionStorage.setItem('user_token', res.token);
      sessionStorage.setItem('user_data', JSON.stringify(res.user));
    }
    showToast(`√Â·« ${res.user.full_name}! ??`, 'success');
    closeModal('login-modal');
    updateUserUI();
    updateNotificationBadge();
  } else {
    showToast(res.message, 'error');
    form.querySelector('[name="password"]')?.classList.add('shake');
    setTimeout(() => form.querySelector('[name="password"]')?.classList.remove('shake'), 500);
  }
}

/* ====================  ”ÃÌ· „” Œœ„ ÃœÌœ ==================== */
async function registerUser(e) {
  e.preventDefault();
  const form = e.target;

  const loginType = document.querySelector('.auth-tab.active')?.dataset.tab || 'email';
  const full_name = form.querySelector('[name="full_name"]')?.value?.trim();
  const password = form.querySelector('[name="password"]')?.value;
  const confirm = form.querySelector('[name="confirm_password"]')?.value;
  const agree = form.querySelector('[name="agree"]')?.checked;

  /* «· Õﬁﬁ „‰ «·»Ì«‰«  */
  if (!full_name) { showToast('√œŒ· «·«”„ «·ﬂ«„·', 'warning'); return; }
  if (password.length < 6) { showToast('ﬂ·„… «·„—Ê— ÌÃ» √‰  ﬂÊ‰ 6 √Õ—› ⁄·Ï «·√ﬁ·', 'warning'); return; }
  if (password !== confirm) { showToast('ﬂ·„ « «·„—Ê— €Ì— „ ÿ«»ﬁ «‰', 'error'); return; }
  if (!agree) { showToast('ÌÃ» «·„Ê«›ﬁ… ⁄·Ï «·‘—Êÿ Ê«·√Õﬂ«„', 'warning'); return; }

  const body = { full_name, password };

  if (loginType === 'phone') {
    const phone = form.querySelector('[name="phone"]')?.value?.trim();
    if (!phone) { showToast('√œŒ· —ﬁ„ «·Â« ›', 'warning'); return; }
    /* «· Õﬁﬁ „‰ «·’Ì€… «·„’—Ì… */
    if (!validateEgyptianPhone(phone)) { showToast('√œŒ· —ﬁ„ Â« › „’—Ì ’ÕÌÕ (Ì»œ√ »‹ 010, 011, 012, 015)', 'warning'); return; }
    body.phone = phone;
  } else {
    const email = form.querySelector('[name="email"]')?.value?.trim();
    if (!email || !validateEmail(email)) { showToast('√œŒ· »—Ìœ ≈·ﬂ —Ê‰Ì ’ÕÌÕ', 'warning'); return; }
    body.email = email;
  }

  const btn = form.querySelector('[type="submit"]');
  setButtonLoading(btn, true, 'Ã«—Ì ≈‰‘«¡ «·Õ”«»...');

  const res = await apiRequest('/auth/register', { method: 'POST', body });
  setButtonLoading(btn, false, '≈‰‘«¡ «·Õ”«»');

  if (res.success) {
    AppState.token = res.token;
    AppState.user = res.user;
    localStorage.setItem('user_token', res.token);
    localStorage.setItem('user_data', JSON.stringify(res.user));
    showToast('??  „ ≈‰‘«¡ Õ”«»ﬂ »‰Ã«Õ!', 'success');
    closeModal('login-modal');
    updateUserUI();
  } else {
    showToast(res.message, 'error');
  }
}

/* ==================== ‰”Ì  ﬂ·„… «·„—Ê— ==================== */
let forgotStep = 1;
let forgotIdentifier = '';

async function sendForgotCode(e) {
  e.preventDefault();
  const identifier = document.getElementById('forgot-identifier')?.value?.trim();
  if (!identifier) { showToast('√œŒ· «·»—Ìœ «·≈·ﬂ —Ê‰Ì √Ê —ﬁ„ «·Â« ›', 'warning'); return; }

  forgotIdentifier = identifier;
  const btn = e.target.querySelector('[type="submit"]') || document.getElementById('forgot-send-btn');
  setButtonLoading(btn, true, 'Ã«—Ì «·≈—”«·...');

  const res = await apiRequest('/auth/forgot-password', { method: 'POST', body: { identifier } });
  setButtonLoading(btn, false, '≈—”«· «·ﬂÊœ');

  if (res.success) {
    showToast(' „ ≈—”«· ﬂÊœ «· Õﬁﬁ', 'success');
    showForgotStep(2);
    /* ›Ì »Ì∆… «· ÿÊÌ—: ⁄—÷ «·ﬂÊœ */
    if (res.debug_code) {
      showToast(`ﬂÊœ «· Õﬁﬁ: ${res.debug_code}`, 'info', 10000);
    }
  } else {
    showToast(res.message, 'error');
  }
}

async function verifyForgotCode(e) {
  e.preventDefault();
  const code = document.getElementById('forgot-code')?.value?.trim();
  if (!code) { showToast('√œŒ· ﬂÊœ «· Õﬁﬁ', 'warning'); return; }
  /* «·«‰ ﬁ«· ··ŒÿÊ… «· «·Ì… */
  showForgotStep(3);
}

async function resetPassword(e) {
  e.preventDefault();
  const code = document.getElementById('forgot-code')?.value?.trim();
  const newPass = document.getElementById('new-password')?.value;
  const confirmPass = document.getElementById('confirm-new-password')?.value;

  if (!newPass || newPass.length < 6) { showToast('ﬂ·„… «·„—Ê— ÌÃ» √‰  ﬂÊ‰ 6 √Õ—› ⁄·Ï «·√ﬁ·', 'warning'); return; }
  if (newPass !== confirmPass) { showToast('ﬂ·„ « «·„—Ê— €Ì— „ ÿ«»ﬁ «‰', 'error'); return; }

  const btn = e.target.querySelector('[type="submit"]');
  setButtonLoading(btn, true, 'Ã«—Ì «· €ÌÌ—...');

  const res = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { identifier: forgotIdentifier, code, new_password: newPass }
  });

  setButtonLoading(btn, false, ' €ÌÌ— ﬂ·„… «·„—Ê—');

  if (res.success) {
    showToast('?  „  €ÌÌ— ﬂ·„… «·„—Ê— »‰Ã«Õ!', 'success');
    closeModal('forgot-modal');
    forgotStep = 1;
    openModal('login-modal');
  } else {
    showToast(res.message, 'error');
  }
}

function showForgotStep(step) {
  forgotStep = step;
  document.querySelectorAll('.forgot-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`forgot-step-${step}`)?.classList.add('active');
}

/* ====================  ”ÃÌ· œŒÊ· «·√œ„‰ ==================== */
async function adminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('admin-username')?.value?.trim();
  const password = document.getElementById('admin-password')?.value;

  if (!username || !password) {
    showToast('√œŒ· «”„ «·„” Œœ„ Êﬂ·„… «·„—Ê—', 'warning');
    return;
  }

  const btn = e.target.querySelector('[type="submit"]');
  setButtonLoading(btn, true, 'Ã«—Ì «· Õﬁﬁ...');

  const res = await apiRequest('/auth/admin-login', { method: 'POST', body: { username, password } });
  setButtonLoading(btn, false, 'œŒÊ·');

  if (res.success) {
    AppState.adminToken = res.token;
    localStorage.setItem('admin_token', res.token);
    localStorage.setItem('admin_data', JSON.stringify(res.admin));
    showToast(`√Â·« ${res.admin.full_name}! ??`, 'success');
    activateSection('admin-panel');
    if (AppState.socket) AppState.socket.emit('join_admin');
    if (typeof loadDashboard === 'function') loadDashboard();
  } else {
    showToast(res.message, 'error');
    document.getElementById('admin-username')?.classList.add('shake');
    setTimeout(() => document.getElementById('admin-username')?.classList.remove('shake'), 500);
  }
}

/* ====================  ”ÃÌ· «·Œ—ÊÃ ==================== */
function logoutUser() {
  AppState.token = null;
  AppState.user = null;
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_data');
  sessionStorage.removeItem('user_token');
  sessionStorage.removeItem('user_data');
  showToast(' „  ”ÃÌ· «·Œ—ÊÃ', 'info');
  updateUserUI();
  navigateTo('home-section');
}

function logoutAdmin() {
  if (!confirm('Â·  —Ìœ  ”ÃÌ· «·Œ—ÊÃ „‰ ·ÊÕ… «· Õﬂ„ø')) return;
  AppState.adminToken = null;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_data');
  showToast(' „  ”ÃÌ· «·Œ—ÊÃ', 'info');
  activateSection('home-section');
}

/* ====================  ÕœÌÀ Ê«ÃÂ… «·„” Œœ„ ==================== */
function updateUserUI() {
  const user = AppState.user;
  const isLogged = !!user;

  /* “— «·Õ”«» ›Ì «·ÂÌœ— */
  const userBtn = document.getElementById('user-btn');
  const userMenu = document.getElementById('user-dropdown');

  if (userBtn) {
    if (isLogged) {
      userBtn.innerHTML = `<div class="user-avatar">${user.full_name?.charAt(0) || '„'}</div>`;
      userBtn.title = user.full_name;
    } else {
      userBtn.innerHTML = '<i class="icon-user"></i>';
      userBtn.title = ' ”ÃÌ· «·œŒÊ·';
    }
  }

  /* ﬁ«∆„… «·„” Œœ„ */
  if (userMenu) {
    userMenu.innerHTML = isLogged ? `
      <div class="dropdown-user-info">
        <div class="dropdown-avatar">${user.full_name?.charAt(0) || '„'}</div>
        <div>
          <div class="dropdown-name">${user.full_name}</div>
          <div class="dropdown-email">${user.email || user.phone || ''}</div>
        </div>
      </div>
      <div class="dropdown-divider"></div>
      <a href="#" class="dropdown-item" onclick="navigateTo('profile-section'); closeUserDropdown()"><i class="icon-user"></i> Õ”«»Ì</a>
      <a href="#" class="dropdown-item" onclick="navigateTo('orders-section'); closeUserDropdown()"><i class="icon-bag"></i> ÿ·»« Ì</a>
      <a href="#" class="dropdown-item" onclick="navigateTo('favorites-section'); loadFavoritesPage(); closeUserDropdown()"><i class="icon-heart"></i> „›÷· Ì</a>
      <a href="#" class="dropdown-item" onclick="navigateTo('points-section'); closeUserDropdown()"><i class="icon-star"></i> ‰ﬁ«ÿÌ</a>
      <div class="dropdown-divider"></div>
      <a href="#" class="dropdown-item danger" onclick="logoutUser()"><i class="icon-logout"></i>  ”ÃÌ· «·Œ—ÊÃ</a>
    ` : `
      <a href="#" class="dropdown-item" onclick="openModal('login-modal'); closeUserDropdown()"><i class="icon-login"></i>  ”ÃÌ· «·œŒÊ·</a>
      <a href="#" class="dropdown-item" onclick="openModal('login-modal'); showRegisterTab(); closeUserDropdown()"><i class="icon-user-plus"></i> ≈‰‘«¡ Õ”«»</a>
    `;
  }

  /*  ÕœÌÀ «·≈‘⁄«—«  */
  if (isLogged) updateNotificationBadge();
}

function closeUserDropdown() {
  document.getElementById('user-dropdown')?.classList.remove('active');
}

function toggleUserDropdown() {
  document.getElementById('user-dropdown')?.classList.toggle('active');
}

/* ==================== «·„·› «·‘Œ’Ì ==================== */
async function loadProfile() {
  if (!AppState.token) { openModal('login-modal'); return; }
  const res = await apiRequest('/auth/profile');
  if (!res.success) { showToast('ÕœÀ Œÿ√ ›Ì «· Õ„Ì·', 'error'); return; }

  const user = res.user;
  AppState.user = user;

  const container = document.getElementById('profile-content');
  if (container) {
    container.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar-wrap">
          <div class="profile-avatar">${user.full_name?.charAt(0) || '„'}</div>
          <div class="profile-info">
            <h2>${user.full_name}</h2>
            <p>${user.email || user.phone || ''}</p>
            <span class="points-badge">?? ${user.points} ‰ﬁÿ…</span>
          </div>
        </div>
        <form id="profile-form" onsubmit="updateProfile(event)">
          <div class="form-group">
            <label>«·«”„ «·ﬂ«„·</label>
            <input type="text" name="full_name" value="${user.full_name}" class="form-control" required>
          </div>
          <div class="form-group">
            <label>—ﬁ„ «·Â« ›</label>
            <input type="tel" name="phone" value="${user.phone || ''}" class="form-control" placeholder="01XXXXXXXXX">
          </div>
          <div class="form-group">
            <label>«·»—Ìœ «·≈·ﬂ —Ê‰Ì</label>
            <input type="email" value="${user.email || ''}" class="form-control" disabled>
          </div>
          <div class="form-group">
            <label>«·⁄÷Ê „‰–</label>
            <input type="text" value="${formatDate(user.created_at)}" class="form-control" disabled>
          </div>
          <button type="submit" class="btn btn-primary">Õ›Ÿ «· €ÌÌ—« </button>
        </form>
        <div class="divider"></div>
        <h3> €ÌÌ— ﬂ·„… «·„—Ê—</h3>
        <form id="change-pass-form" onsubmit="changePassword(event)">
          <div class="form-group">
            <label>ﬂ·„… «·„—Ê— «·Õ«·Ì…</label>
            <input type="password" name="old_password" class="form-control" required>
          </div>
          <div class="form-group">
            <label>ﬂ·„… «·„—Ê— «·ÃœÌœ…</label>
            <input type="password" name="new_password" class="form-control" required minlength="6">
          </div>
          <button type="submit" class="btn btn-outline"> €ÌÌ— ﬂ·„… «·„—Ê—</button>
        </form>
      </div>
    `;
  }
}

async function updateProfile(e) {
  e.preventDefault();
  const form = e.target;
  const body = {
    full_name: form.querySelector('[name="full_name"]')?.value,
    phone: form.querySelector('[name="phone"]')?.value,
  };
  const res = await apiRequest('/auth/profile', { method: 'PUT', body });
  if (res.success) {
    showToast('?  „  ÕœÌÀ »Ì«‰« ﬂ', 'success');
    AppState.user = { ...AppState.user, ...body };
    localStorage.setItem('user_data', JSON.stringify(AppState.user));
    updateUserUI();
  } else {
    showToast(res.message, 'error');
  }
}

async function changePassword(e) {
  e.preventDefault();
  const form = e.target;
  const old_password = form.querySelector('[name="old_password"]')?.value;
  const new_password = form.querySelector('[name="new_password"]')?.value;
  const res = await apiRequest('/auth/change-password', { method: 'PUT', body: { old_password, new_password } });
  if (res.success) {
    showToast('?  „  €ÌÌ— ﬂ·„… «·„—Ê—', 'success');
    form.reset();
  } else {
    showToast(res.message, 'error');
  }
}

/* ====================  »œÌ·  ”ÃÌ· «·œŒÊ· (Â« ›/≈Ì„Ì·) ==================== */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.auth-tab[data-tab="${tab}"]`)?.classList.add('active');

  const emailField = document.getElementById('login-email-field');
  const phoneField = document.getElementById('login-phone-field');

  if (tab === 'email') {
    if (emailField) emailField.style.display = '';
    if (phoneField) phoneField.style.display = 'none';
    document.querySelector('[name="identifier"]')?.setAttribute('placeholder', '«·»—Ìœ «·≈·ﬂ —Ê‰Ì');
    document.querySelector('[name="identifier"]')?.setAttribute('type', 'email');
  } else {
    if (emailField) emailField.style.display = 'none';
    if (phoneField) phoneField.style.display = '';
    document.querySelector('[name="identifier"]')?.setAttribute('placeholder', '—ﬁ„ «·Â« › („À«·: 01012345678)');
    document.querySelector('[name="identifier"]')?.setAttribute('type', 'tel');
  }
}

function switchRegisterTab(tab) {
  document.querySelectorAll('.register-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.register-tab[data-tab="${tab}"]`)?.classList.add('active');

  const emailField = document.getElementById('register-email-field');
  const phoneField = document.getElementById('register-phone-field');

  if (tab === 'email') {
    if (emailField) emailField.style.display = '';
    if (phoneField) phoneField.style.display = 'none';
  } else {
    if (emailField) emailField.style.display = 'none';
    if (phoneField) phoneField.style.display = '';
  }
}

/* ====================  »œÌ· »Ì‰  ”ÃÌ· «·œŒÊ· Ê«· ”ÃÌ· ==================== */
function showLoginTab() {
  document.getElementById('login-form-wrapper')?.classList.add('active');
  document.getElementById('register-form-wrapper')?.classList.remove('active');
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.modal-tab[onclick*="showLoginTab"]')?.classList.add('active');
}

function showRegisterTab() {
  document.getElementById('login-form-wrapper')?.classList.remove('active');
  document.getElementById('register-form-wrapper')?.classList.add('active');
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.modal-tab[onclick*="showRegisterTab"]')?.classList.add('active');
}

/* ==================== «· Õﬁﬁ „‰ «·»Ì«‰«  ==================== */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateEgyptianPhone(phone) {
  /* Ì»œ√ »‹ 010, 011, 012, 015 ÊÌ ﬂÊ‰ „‰ 11 —ﬁ„ */
  return /^(010|011|012|015)[0-9]{8}$/.test(phone.replace(/\s/g, ''));
}

/* ==================== „”«⁄œ “— «· Õ„Ì· ==================== */
function setButtonLoading(btn, loading, text) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = text;
  if (loading) btn.classList.add('loading');
  else btn.classList.remove('loading');
}

/* ====================  Õ„Ì· »Ì«‰«  «·œŒÊ· «·„Õ›ÊŸ… ==================== */
function restoreSession() {
  const token = localStorage.getItem('user_token') || sessionStorage.getItem('user_token');
  const userData = localStorage.getItem('user_data') || sessionStorage.getItem('user_data');
  if (token && userData) {
    AppState.token = token;
    AppState.user = JSON.parse(userData);
  }

  const adminToken = localStorage.getItem('admin_token');
  if (adminToken) {
    AppState.adminToken = adminToken;
  }

  updateUserUI();
}

/* «” ⁄«œ… «·Ã·”… ⁄‰œ  Õ„Ì· «·’›Õ… */
document.addEventListener('DOMContentLoaded', restoreSession);
