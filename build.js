// build.js — bundles the source into a single self-contained dist/index.html.
// Because the source uses classic scripts + a shared global namespace (not ES modules),
// bundling is just: inline the CSS, then concatenate the JS in load order.
// Run: node build.js

const fs = require('fs');
const path = require('path');
const root = __dirname;

const css = fs.readFileSync(path.join(root, 'src/ui/styles.css'), 'utf8');

const jsFiles = [
  'src/data/roster.js',
  'src/core/avatar.js',
  'src/core/roster-store.js',
  'src/ui/app.js',
];
const js = jsFiles
  .map(function (f) { return '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(root, f), 'utf8'); })
  .join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>NameDeck — prototype</title>
<style>
${css}
</style>
</head>
<body>
  <div class="phone"><div id="app"></div></div>
  <script>
${js}
  </script>
</body>
</html>
`;

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log('Built dist/index.html (' + Math.round(html.length / 1024) + ' KB)');
