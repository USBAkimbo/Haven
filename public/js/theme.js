// ═══════════════════════════════════════════════════════════
// Haven — Shared Theme Switcher (loaded on all pages)
// ═══════════════════════════════════════════════════════════

function initThemeSwitcher(containerId, socket) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const saved = localStorage.getItem('haven_theme') || 'haven';

  // Set active button
  container.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === saved);

    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('haven_theme', theme);

      // Update active state on ALL theme selectors on the page
      document.querySelectorAll('.theme-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.theme === theme);
      });

      // Persist to server if socket available
      if (socket && socket.connected) {
        socket.emit('set-preference', { key: 'theme', value: theme });
      }
    });
  });
}

function applyThemeFromServer(theme) {
  if (!theme) return;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('haven_theme', theme);
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
}
