// avatar.js — deterministic procedural avatars.
//
// Generates a distinct, repeatable SVG face from a seed string. Same seed -> same face.
// This stands in for a real photo in the prototype so we never handle a real person's
// image. In the native app, this is replaced by the (locally stored) student photo.

window.NameDeck = window.NameDeck || {};

(function () {
  // Simple deterministic string hash -> 32-bit int.
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Seeded pseudo-random generator (mulberry32).
  function rng(seedInt) {
    let a = seedInt;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const BG        = ['#5B8DEF', '#EF7A5B', '#3FB68B', '#B65BEF', '#EFC15B', '#5BC7EF', '#EF5B9C', '#7A8B99'];
  const SKIN      = ['#F2D3B3', '#E5B98E', '#C68642', '#8D5524', '#5C3A21', '#FFE0BD'];
  const HAIR      = ['#2B2B2B', '#4A2E19', '#7A4B1E', '#B8860B', '#8B0000', '#D9D9D9', '#1A1A1A'];
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

  // Returns an SVG string for the given seed.
  NameDeck.avatar = function (seed, size) {
    size = size || 160;
    const r = rng(hash(seed));
    const bg = pick(BG, r);
    const skin = pick(SKIN, r);
    const hair = pick(HAIR, r);
    const hairStyle = Math.floor(r() * 4); // 0 short, 1 flat-top, 2 curly, 3 bald-ish
    const hasBeard = r() > 0.6;
    const eyeType = Math.floor(r() * 3);
    const browRaise = r() > 0.5 ? -2 : 0;

    // Face geometry (viewBox 100x100)
    const cx = 50, cy = 54, fr = 26; // face center + radius

    let hairSvg = '';
    if (hairStyle === 0) {
      hairSvg = `<path d="M24 46 Q50 8 76 46 Q76 30 50 24 Q24 30 24 46 Z" fill="${hair}"/>`;
    } else if (hairStyle === 1) {
      hairSvg = `<rect x="24" y="22" width="52" height="20" rx="6" fill="${hair}"/>`;
    } else if (hairStyle === 2) {
      hairSvg = `<g fill="${hair}">
        <circle cx="30" cy="34" r="9"/><circle cx="42" cy="26" r="10"/>
        <circle cx="58" cy="26" r="10"/><circle cx="70" cy="34" r="9"/>
        <circle cx="50" cy="24" r="10"/></g>`;
    } else {
      hairSvg = `<path d="M26 42 Q50 30 74 42 Q70 34 50 32 Q30 34 26 42 Z" fill="${hair}" opacity="0.9"/>`;
    }

    const beardSvg = hasBeard
      ? `<path d="M${cx-fr+4} ${cy+6} Q${cx} ${cy+fr+12} ${cx+fr-4} ${cy+6} Q${cx} ${cy+fr} ${cx-fr+4} ${cy+6} Z" fill="${hair}" opacity="0.85"/>`
      : '';

    let eyesSvg;
    if (eyeType === 0) {
      eyesSvg = `<circle cx="41" cy="52" r="3" fill="#222"/><circle cx="59" cy="52" r="3" fill="#222"/>`;
    } else if (eyeType === 1) {
      eyesSvg = `<rect x="38" y="50" width="7" height="4" rx="2" fill="#222"/><rect x="55" y="50" width="7" height="4" rx="2" fill="#222"/>`;
    } else {
      eyesSvg = `<path d="M38 52 Q41 49 44 52" stroke="#222" stroke-width="2.4" fill="none" stroke-linecap="round"/>
                 <path d="M56 52 Q59 49 62 52" stroke="#222" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    }

    const browsSvg = `<path d="M37 ${46+browRaise} q4 -2 8 0" stroke="${hair}" stroke-width="2" fill="none" stroke-linecap="round"/>
                      <path d="M55 ${46+browRaise} q4 -2 8 0" stroke="${hair}" stroke-width="2" fill="none" stroke-linecap="round"/>`;

    const smile = r() > 0.5;
    const mouthSvg = smile
      ? `<path d="M43 64 Q50 71 57 64" stroke="#7a3b2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      : `<path d="M44 66 L56 66" stroke="#7a3b2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;

    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="avatar">
      <defs><clipPath id="cl-${hash(seed)}"><rect width="100" height="100" rx="16"/></clipPath></defs>
      <g clip-path="url(#cl-${hash(seed)})">
        <rect width="100" height="100" fill="${bg}"/>
        <circle cx="${cx}" cy="88" r="34" fill="#ffffff" opacity="0.18"/>
        <circle cx="${cx}" cy="${cy}" r="${fr}" fill="${skin}"/>
        ${beardSvg}
        <ellipse cx="${cx-fr+2}" cy="${cy+2}" rx="4" ry="6" fill="${skin}"/>
        <ellipse cx="${cx+fr-2}" cy="${cy+2}" rx="4" ry="6" fill="${skin}"/>
        ${hairSvg}
        ${browsSvg}
        ${eyesSvg}
        ${mouthSvg}
      </g>
    </svg>`;
  };
})();
