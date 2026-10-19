/* Light / dark theme. Loaded as a blocking script in <head> so the page never flashes the wrong colours.
   Order of precedence: the visitor's saved choice, then the device setting (prefers-color-scheme), then light. */
(function () {
  var KEY = 'sosavto-theme';
  var root = document.documentElement;
  var query = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var COLORS = { light: '#F6F8FB', dark: '#0F141B' };
  var LABELS = { light: 'Tünd rejimə keç', dark: 'İşıqlı rejimə keç' };

  function saved() {
    try {
      var value = window.localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function remember(theme) {
    try {
      window.localStorage.setItem(KEY, theme);
    } catch (e) {
      /* private mode or blocked storage: the choice simply lasts for this page view */
    }
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', COLORS[theme]);
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-label', LABELS[theme]);
      buttons[i].setAttribute('title', LABELS[theme]);
    }
  }

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  apply(saved() || (query && query.matches ? 'dark' : 'light'));

  /* The header is drawn by app.js after this script runs, so clicks are handled on the document. */
  document.addEventListener('click', function (event) {
    var target = event.target;
    var button = target && target.closest ? target.closest('[data-theme-toggle]') : null;
    if (!button) return;
    var next = current() === 'dark' ? 'light' : 'dark';
    remember(next);
    apply(next);
  });

  /* Visitors who never chose follow the device when it changes (for example automatic dark mode at night). */
  if (query) {
    var follow = function (event) {
      if (!saved()) apply(event.matches ? 'dark' : 'light');
    };
    if (query.addEventListener) query.addEventListener('change', follow);
    else if (query.addListener) query.addListener(follow);
  }
})();
