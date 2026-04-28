(async () => {
  try {
    const res = await fetch('/api/user');
    if (!res.ok) { window.location.href = '/login'; return; }
    const user = await res.json();

    const nav = document.querySelector('.header-nav') || document.querySelector('.header-inner');
    if (!nav) return;

    const el = document.createElement('div');
    el.className = 'header-user';
    el.innerHTML = `
      <span class="header-username">${escapeHtml(user.nickname)}</span>
      <a href="/auth/logout" class="btn-logout">로그아웃</a>
    `;
    nav.appendChild(el);
  } catch {
    window.location.href = '/login';
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
