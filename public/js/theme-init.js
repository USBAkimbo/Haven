// Apply saved theme immediately to prevent flash of unstyled content
(function() {
  var t = localStorage.getItem('haven_theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
})();
