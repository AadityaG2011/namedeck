// build.js — bundles the source into a single self-contained dist/index.html.
// Because the source uses classic scripts + a shared global namespace (not ES modules),
// bundling is just: inline the CSS, then concatenate the JS in load order.
// Run: node build.js

const fs = require('fs');
const path = require('path');
const root = __dirname;

const css = fs.readFileSync(path.join(root, 'src/ui/styles.css'), 'utf8');

const jsFiles = [
  'src/core/avatar.js',
  'src/core/roster-store.js',
  'src/ui/google-import.js',
  'src/ui/app.js',
];
const js = jsFiles
  .map(function (f) { return '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(root, f), 'utf8'); })
  .join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
<title>NameDeck</title>
<meta name="theme-color" content="#0f1420" />
<link rel="manifest" href="manifest.webmanifest" />
<link rel="icon" type="image/png" href="icon-192.png" />
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="NameDeck" />
<style>
${css}
</style>
</head>
<body>
  <div class="phone"><div id="app"></div></div>
  <script>
${js}
  </script>
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  </script>
</body>
</html>
`;

// PWA assets served alongside the single-file app shell (manifest, service worker, icons).
const pwaAssets = [
  'manifest.webmanifest',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
pwaAssets.forEach(function (f) {
  fs.copyFileSync(path.join(root, 'src/pwa', f), path.join(root, 'dist', f));
});
console.log('Built dist/index.html (' + Math.round(html.length / 1024) + ' KB) + PWA assets: ' + pwaAssets.join(', '));
