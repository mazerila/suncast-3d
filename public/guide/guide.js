// Language selector for the guide pages — same look and behaviour as the one
// in the app's control panel: the current flag, click opens the list. Each
// entry is a plain link to that language's guide, so it works without JS too
// (the <noscript> fallback in each page lists the same links).
(function () {
  var LANGS = [
    { code: 'en', name: 'English',  href: '/guide/' },
    { code: 'fr', name: 'Français', href: '/guide/fr/' },
    { code: 'es', name: 'Español',  href: '/guide/es/' },
    { code: 'de', name: 'Deutsch',  href: '/guide/de/' },
    { code: 'it', name: 'Italiano', href: '/guide/it/' },
  ];
  var FLAGS = {
    en: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#012169"/><path d="M0 0L60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" stroke-width="3"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="13"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="8"/></svg>',
    fr: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ED2939"/></svg>',
    es: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/></svg>',
    de: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#000"/><rect y="13.3" width="60" height="13.4" fill="#DD0000"/><rect y="26.7" width="60" height="13.3" fill="#FFCE00"/></svg>',
    it: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="20" height="40" fill="#009246"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#CE2B37"/></svg>',
  };
  var LABEL = { en: 'Language', fr: 'Langue', es: 'Idioma', de: 'Sprache', it: 'Lingua' };

  var box = document.getElementById('lang');
  if (!box) return;
  var cur = box.getAttribute('data-current') || 'en';
  var name = (LANGS.filter(function (l) { return l.code === cur; })[0] || LANGS[0]).name;

  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', LABEL[cur] || LABEL.en);
  box.innerHTML =
    '<button type="button" id="lang-btn" class="flag" aria-haspopup="menu" aria-expanded="false" title="' +
      (LABEL[cur] || LABEL.en) + ': ' + name + '" aria-label="' + (LABEL[cur] || LABEL.en) + ': ' + name + '">' +
      (FLAGS[cur] || '') + '</button>' +
    '<ul id="lang-menu" role="menu" hidden>' + LANGS.map(function (l) {
      return '<li role="none"><a role="menuitem" class="flag" href="' + l.href + '" hreflang="' + l.code + '"' +
        (l.code === cur ? ' aria-current="true"' : '') + '>' + (FLAGS[l.code] || '') + '<span>' + l.name + '</span></a></li>';
    }).join('') + '</ul>';

  var btn = document.getElementById('lang-btn'), menu = document.getElementById('lang-menu');
  function toggle(open) {
    var want = open === undefined ? menu.hidden : open;
    menu.hidden = !want;
    btn.setAttribute('aria-expanded', String(want));
  }
  btn.addEventListener('click', function () { toggle(); });
  document.addEventListener('pointerdown', function (e) { if (!menu.hidden && !e.target.closest('#lang')) toggle(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) toggle(false); });
})();
