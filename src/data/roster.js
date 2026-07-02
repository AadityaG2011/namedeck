// roster.js — real squad sample data: USA Men's National Team, FIFA World Cup 2026.
//
// Senior national-team players — public adult figures (no minors). Their names are
// public facts. Photos are NOT bundled: at runtime the app fetches each player's
// portrait from Wikipedia's REST API (see app.js). Wikipedia disallows unlicensed
// photos of living people, so those portraits are freely licensed. If a portrait can't
// load, the app falls back to a generated avatar (avatar.js).
//
// In the real product this array becomes a school-authorized student roster, stored
// locally on the teacher's device.
//
//   preferredName the name you're quizzed on
//   wiki          Wikipedia article title, used to fetch the portrait at runtime
//   position/number shown after the name is revealed
//   avatarSeed    offline fallback avatar

window.NameDeck = window.NameDeck || {};

NameDeck.roster = [
  { id: 'u01', preferredName: 'Matt Turner',        wiki: 'Matt_Turner_(soccer)',   position: 'Goalkeeper', number: 1,  avatarSeed: 'turner' },
  { id: 'u02', preferredName: 'Matt Freese',        wiki: 'Matt_Freese',            position: 'Goalkeeper', number: 24, avatarSeed: 'freese' },
  { id: 'u03', preferredName: 'Chris Brady',        wiki: 'Chris_Brady_(soccer)',   position: 'Goalkeeper', number: 25, avatarSeed: 'brady' },
  { id: 'u04', preferredName: 'Sergiño Dest',       wiki: 'Sergiño_Dest',           position: 'Defender',   number: 2,  avatarSeed: 'dest' },
  { id: 'u05', preferredName: 'Chris Richards',     wiki: 'Chris_Richards_(soccer)',position: 'Defender',   number: 3,  avatarSeed: 'richards' },
  { id: 'u06', preferredName: 'Antonee Robinson',   wiki: 'Antonee_Robinson',       position: 'Defender',   number: 5,  avatarSeed: 'arobinson' },
  { id: 'u07', preferredName: 'Auston Trusty',      wiki: 'Auston_Trusty',          position: 'Defender',   number: 6,  avatarSeed: 'trusty' },
  { id: 'u08', preferredName: 'Miles Robinson',     wiki: 'Miles_Robinson_(soccer)',position: 'Defender',   number: 12, avatarSeed: 'mrobinson' },
  { id: 'u09', preferredName: 'Tim Ream',           wiki: 'Tim_Ream',               position: 'Defender',   number: 13, avatarSeed: 'ream' },
  { id: 'u10', preferredName: 'Alex Freeman',       wiki: 'Alex_Freeman'                ,  position: 'Defender',   number: 16, avatarSeed: 'freeman' },
  { id: 'u11', preferredName: 'Max Arfsten',        wiki: 'Max_Arfsten',            position: 'Defender',   number: 18, avatarSeed: 'arfsten' },
  { id: 'u12', preferredName: 'Mark McKenzie',      wiki: 'Mark_McKenzie_(soccer,_born_1999)', position: 'Defender',   number: 22, avatarSeed: 'mckenzie' },
  { id: 'u13', preferredName: 'Joe Scally',         wiki: 'Joe_Scally',             position: 'Defender',   number: 23, avatarSeed: 'scally' },
  { id: 'u14', preferredName: 'Tyler Adams',        wiki: 'Tyler_Adams'                ,   position: 'Midfielder', number: 4,  avatarSeed: 'adams' },
  { id: 'u15', preferredName: 'Gio Reyna',          wiki: 'Giovanni_Reyna',         position: 'Midfielder', number: 7,  avatarSeed: 'reyna' },
  { id: 'u16', preferredName: 'Weston McKennie',    wiki: 'Weston_McKennie',        position: 'Midfielder', number: 8,  avatarSeed: 'mckennie' },
  { id: 'u17', preferredName: 'Sebastian Berhalter',wiki: 'Sebastian_Berhalter',    position: 'Midfielder', number: 14, avatarSeed: 'berhalter' },
  { id: 'u18', preferredName: 'Cristian Roldan',    wiki: 'Cristian_Roldan',        position: 'Midfielder', number: 15, avatarSeed: 'roldan' },
  { id: 'u19', preferredName: 'Malik Tillman',      wiki: 'Malik_Tillman',          position: 'Midfielder', number: 17, avatarSeed: 'tillman' },
  { id: 'u20', preferredName: 'Christian Pulisic',  wiki: 'Christian_Pulisic',      position: 'Forward',    number: 10, avatarSeed: 'pulisic' },
  { id: 'u21', preferredName: 'Brenden Aaronson',   wiki: 'Brenden_Aaronson',       position: 'Forward',    number: 11, avatarSeed: 'aaronson' },
  { id: 'u22', preferredName: 'Folarin Balogun',    wiki: 'Folarin_Balogun',        position: 'Forward',    number: 20, avatarSeed: 'balogun' },
  { id: 'u23', preferredName: 'Ricardo Pepi',       wiki: 'Ricardo_Pepi',           position: 'Forward',    number: 9,  avatarSeed: 'pepi' },
  { id: 'u24', preferredName: 'Tim Weah',           wiki: 'Tim_Weah',               position: 'Forward',    number: 21, avatarSeed: 'weah' },
  { id: 'u25', preferredName: 'Haji Wright',        wiki: 'Haji_Wright',            position: 'Forward',    number: 19, avatarSeed: 'wright' },
  { id: 'u26', preferredName: 'Alejandro Zendejas', wiki: 'Alejandro_Zendejas',     position: 'Forward',    number: 26, avatarSeed: 'zendejas' },
];
