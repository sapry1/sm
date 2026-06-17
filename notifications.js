/* ================================================
   notifications.js - äÙÇã ÇáÅÔÚÇÑÇÊ
   ================================================ */

let notificationsPage = 1;

/* ==================== ÊÍãíá ÇáÅÔÚÇÑÇÊ ==================== */
async function loadNotifications() {
  const container = document.getElementById('notifications-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"></div>';

  const res = await apiRequest(`/notifications?page=${notificationsPage}`);
  if (!res.success) { container.innerHTML = '<p class="error">ÍÏË ÎØÃ</p>'; return; }

  if (!res.notifications?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">??</div>
        <h3>áÇ ÊæÌÏ ÅÔÚÇÑÇÊ</h3>
        <p>ÓÊÙåÑ åäÇ ÌãíÚ ÅÔÚÇÑÇÊß</p>
      </div>`;
    return;
  }

  const header = document.getElementById('notifications-header');
  if (header && res.unread > 0) {
    header.innerHTML = `
      <span>${res.unread} ÅÔÚÇÑ ÛíÑ ãŞÑæÁ</span>
      <button class="btn btn-sm btn-outline" onclick="markAllAsRead()">ÊÍÏíÏ Çáßá ßãŞÑæÁ</button>
    `;
  }

  container.innerHTML = res.notifications.map(n => `
    <div class="notification-item ${n.is_read ? 'read' : 'unread'}" onclick="readNotification(${n.id}, this)">
      <div class="notif-icon-wrap">
        ${n.image ? `<img src="${n.image}" class="notif-img">` : '<div class="notif-icon">??</div>'}
        ${!n.is_read ? '<div class="unread-dot"></div>' : ''}
      </div>
      <div class="notif-content">
        <h4>${n.title}</h4>
        ${n.description ? `<p>${n.description}</p>` : ''}
        <span class="notif-time">${timeAgo(n.created_at)}</span>
      </div>
      ${n.url ? `<a href="${n.url}" class="notif-action" onclick="event.stopPropagation()">?</a>` : ''}
    </div>
  `).join('');

  renderPagination('notifications-pagination', notificationsPage, res.pages, (p) => {
    notificationsPage = p;
    loadNotifications();
  });
}

async function readNotification(id, el) {
  if (AppState.token && !el.classList.contains('read')) {
    el.classList.add('read');
    el.classList.remove('unread');
    el.querySelector('.unread-dot')?.remove();
    await apiRequest(`/notifications/read/${id}`, { method: 'PUT' });
    updateNotificationBadge();
  }
}

async function markAllAsRead() {
  if (!AppState.token) return;
  const res = await apiRequest('/notifications/read-all', { method: 'PUT' });
  if (res.success) {
    document.querySelectorAll('.notification-item.unread').forEach(el => {
      el.classList.remove('unread');
      el.classList.add('read');
      el.querySelector('.unread-dot')?.remove();
    });
    updateNotificationBadge();
    showToast('Êã ÊÍÏíÏ Çáßá ßãŞÑæÁ', 'success');
  }
}

/* ÊÍÏíË ÔÇÑÉ ÇáÅÔÚÇÑÇÊ */
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
