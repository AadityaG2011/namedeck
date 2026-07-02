// roster.js — REAL public figures (sample data for the prototype).
//
// These are actual, long-public historical figures. Their names are public facts and
// their portraits are public domain. Photos are NOT bundled: at runtime the app fetches
// each person's current portrait from Wikipedia's REST API (see app.js). If a photo
// can't load, the app falls back to a generated avatar (avatar.js).
//
// Only long-deceased public figures are used on purpose — no private individuals and
// no minors. In the real product this array becomes a school-authorized roster of
// students, stored locally on the teacher's device.
//
//   preferredName the name you're quizzed on
//   wiki          Wikipedia article title, used to fetch the portrait at runtime
//   role, years   shown after the name is revealed
//   avatarSeed    offline fallback avatar

window.NameDeck = window.NameDeck || {};

NameDeck.roster = [
  { id: 'f01', preferredName: 'Albert Einstein',       wiki: 'Albert_Einstein',        role: 'Physicist',            years: '1879–1955', avatarSeed: 'einstein' },
  { id: 'f02', preferredName: 'Marie Curie',           wiki: 'Marie_Curie',            role: 'Physicist & chemist',  years: '1867–1934', avatarSeed: 'curie' },
  { id: 'f03', preferredName: 'Abraham Lincoln',       wiki: 'Abraham_Lincoln',        role: 'US President',         years: '1809–1865', avatarSeed: 'lincoln' },
  { id: 'f04', preferredName: 'Charles Darwin',        wiki: 'Charles_Darwin',         role: 'Naturalist',           years: '1809–1882', avatarSeed: 'darwin' },
  { id: 'f05', preferredName: 'Nikola Tesla',          wiki: 'Nikola_Tesla',           role: 'Inventor',             years: '1856–1943', avatarSeed: 'tesla' },
  { id: 'f06', preferredName: 'Mahatma Gandhi',        wiki: 'Mahatma_Gandhi',         role: 'Independence leader',  years: '1869–1948', avatarSeed: 'gandhi' },
  { id: 'f07', preferredName: 'Vincent van Gogh',      wiki: 'Vincent_van_Gogh',       role: 'Painter',              years: '1853–1890', avatarSeed: 'vangogh' },
  { id: 'f08', preferredName: 'Amelia Earhart',        wiki: 'Amelia_Earhart',         role: 'Aviator',              years: '1897–1937', avatarSeed: 'earhart' },
  { id: 'f09', preferredName: 'Mark Twain',            wiki: 'Mark_Twain',             role: 'Author',               years: '1835–1910', avatarSeed: 'twain' },
  { id: 'f10', preferredName: 'Ludwig van Beethoven',  wiki: 'Ludwig_van_Beethoven',   role: 'Composer',             years: '1770–1827', avatarSeed: 'beethoven' },
  { id: 'f11', preferredName: 'Frederick Douglass',    wiki: 'Frederick_Douglass',     role: 'Abolitionist',         years: '1818–1895', avatarSeed: 'douglass' },
  { id: 'f12', preferredName: 'Florence Nightingale',  wiki: 'Florence_Nightingale',   role: 'Nursing pioneer',      years: '1820–1910', avatarSeed: 'nightingale' },
  { id: 'f13', preferredName: 'Ada Lovelace',          wiki: 'Ada_Lovelace',           role: 'Mathematician',        years: '1815–1852', avatarSeed: 'lovelace' },
  { id: 'f14', preferredName: 'Sojourner Truth',       wiki: 'Sojourner_Truth',        role: 'Abolitionist',         years: 'c.1797–1883', avatarSeed: 'truth' },
  { id: 'f15', preferredName: 'Leonardo da Vinci',     wiki: 'Leonardo_da_Vinci',      role: 'Polymath',             years: '1452–1519', avatarSeed: 'davinci' },
  { id: 'f16', preferredName: 'Wolfgang Amadeus Mozart', wiki: 'Wolfgang_Amadeus_Mozart', role: 'Composer',          years: '1756–1791', avatarSeed: 'mozart' },
];
