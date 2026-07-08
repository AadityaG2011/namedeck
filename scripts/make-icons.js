// make-icons.js — generates the PWA app icons with zero dependencies.
//
// Draws a simple white "person" (head + shoulders) on the app's accent blue — matching
// the roster/people theme — and encodes it as PNG using only Node's built-in zlib.
// Rendered at 3x and box-averaged down for smooth (anti-aliased) edges.
// Run: node scripts/make-icons.js  (writes into src/pwa/)

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'src', 'pwa');
const BG = [0x5b, 0x8d, 0xef]; // accent blue
const FG = [0xff, 0xff, 0xff]; // white

// --- PNG encoding (RGBA, 8-bit) ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(size, px) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const r = y * (1 + size * 4);
    raw[r] = 0; // filter: none
    px.copy(raw, r + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- Draw the person silhouette at hard edges, then supersample down ---
function renderHard(n) {
  const px = Buffer.alloc(n * n * 4);
  const cx = n / 2;
  const headCy = n * 0.38, headR = n * 0.15;
  const bodyCy = n * 0.95, bodyR = n * 0.34;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dh = (x - cx) * (x - cx) + (y - headCy) * (y - headCy);
      const db = (x - cx) * (x - cx) + (y - bodyCy) * (y - bodyCy);
      const col = (dh <= headR * headR || db <= bodyR * bodyR) ? FG : BG;
      const i = (y * n + x) * 4;
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
    }
  }
  return px;
}
function icon(size) {
  const ss = 3, big = size * ss;
  const src = renderHard(big);
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const bi = ((y * ss + dy) * big + (x * ss + dx)) * 4;
          r += src[bi]; g += src[bi + 1]; b += src[bi + 2];
        }
      }
      const n = ss * ss, i = (y * size + x) * 4;
      out[i] = Math.round(r / n); out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n); out[i + 3] = 255;
    }
  }
  return encodePng(size, out);
}

fs.mkdirSync(OUT, { recursive: true });
[['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]].forEach(function (spec) {
  fs.writeFileSync(path.join(OUT, spec[0]), icon(spec[1]));
  console.log('wrote ' + spec[0] + ' (' + spec[1] + 'x' + spec[1] + ')');
});
