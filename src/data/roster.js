// roster.js — synthetic sample data for the prototype.
//
// These are INVENTED names for a fictional Under-23 squad, chosen to be diverse and
// to include pronunciation hints (the feature that helps teachers say names correctly).
// No real person is represented. In the real app this array is replaced by a
// school-authorized roster stored locally on the teacher's device.
//
// Shape of each player:
//   id           unique id
//   preferredName the name the app tests you on
//   legalName     optional full/legal name
//   phonetic      optional pronunciation hint (shown in study mode)
//   position      GK | DF | MF | FW
//   number        jersey number
//   avatarSeed    seed string for the procedural avatar generator

window.NameDeck = window.NameDeck || {};

NameDeck.roster = [
  { id: 'p01', preferredName: 'Mateo',    legalName: 'Mateo Alvarez',        phonetic: 'mah-TAY-oh',     position: 'FW', number: 9,  avatarSeed: 'mateo-alvarez' },
  { id: 'p02', preferredName: 'Kenji',    legalName: 'Kenji Nakamura',       phonetic: 'KEN-jee',        position: 'MF', number: 8,  avatarSeed: 'kenji-nakamura' },
  { id: 'p03', preferredName: 'Amara',    legalName: 'Amara Okafor',         phonetic: 'ah-MAH-rah',     position: 'DF', number: 4,  avatarSeed: 'amara-okafor' },
  { id: 'p04', preferredName: 'Léo',      legalName: 'Léo Dubois',           phonetic: 'LAY-oh',         position: 'MF', number: 10, avatarSeed: 'leo-dubois' },
  { id: 'p05', preferredName: 'Saoirse',  legalName: 'Saoirse Byrne',        phonetic: 'SUR-shuh',       position: 'FW', number: 11, avatarSeed: 'saoirse-byrne' },
  { id: 'p06', preferredName: 'Dmitri',   legalName: 'Dmitri Volkov',        phonetic: 'DMEE-tree',      position: 'GK', number: 1,  avatarSeed: 'dmitri-volkov' },
  { id: 'p07', preferredName: 'Chidi',    legalName: 'Chidi Eze',           phonetic: 'CHEE-dee',       position: 'DF', number: 3,  avatarSeed: 'chidi-eze' },
  { id: 'p08', preferredName: 'Ravi',     legalName: 'Ravi Chandran',        phonetic: 'RAH-vee',        position: 'MF', number: 6,  avatarSeed: 'ravi-chandran' },
  { id: 'p09', preferredName: 'Nikoloz',  legalName: 'Nikoloz Beridze',      phonetic: 'nee-koh-LOZ',    position: 'DF', number: 5,  avatarSeed: 'nikoloz-beridze' },
  { id: 'p10', preferredName: 'Thabo',    legalName: 'Thabo Molefe',         phonetic: 'TAH-boh',        position: 'FW', number: 7,  avatarSeed: 'thabo-molefe' },
  { id: 'p11', preferredName: 'Youssef',  legalName: 'Youssef El-Amin',      phonetic: 'YOO-sef',        position: 'MF', number: 14, avatarSeed: 'youssef-elamin' },
  { id: 'p12', preferredName: 'Bjørn',    legalName: 'Bjørn Halvorsen',      phonetic: 'BYURN',          position: 'DF', number: 2,  avatarSeed: 'bjorn-halvorsen' },
  { id: 'p13', preferredName: 'Iker',     legalName: 'Iker Etxeberria',      phonetic: 'EE-kair',        position: 'GK', number: 12, avatarSeed: 'iker-etxeberria' },
  { id: 'p14', preferredName: 'Tariq',    legalName: 'Tariq Hassan',         phonetic: 'TAH-rik',        position: 'FW', number: 17, avatarSeed: 'tariq-hassan' },
  { id: 'p15', preferredName: 'Joon-ho',  legalName: 'Kim Joon-ho',          phonetic: 'JOON-hoh',       position: 'MF', number: 16, avatarSeed: 'joonho-kim' },
  { id: 'p16', preferredName: 'Andrés',   legalName: 'Andrés Restrepo',      phonetic: 'ahn-DRESS',      position: 'DF', number: 15, avatarSeed: 'andres-restrepo' },
  { id: 'p17', preferredName: 'Emeka',    legalName: 'Emeka Nwosu',          phonetic: 'eh-MEH-kah',     position: 'MF', number: 18, avatarSeed: 'emeka-nwosu' },
  { id: 'p18', preferredName: 'Lucas',    legalName: 'Lucas Ferreira',       phonetic: 'LOO-kas',        position: 'FW', number: 19, avatarSeed: 'lucas-ferreira' },
  { id: 'p19', preferredName: 'Sana',     legalName: 'Sana Qureshi',         phonetic: 'SAH-nah',        position: 'DF', number: 20, avatarSeed: 'sana-qureshi' },
  { id: 'p20', preferredName: 'Milan',    legalName: 'Milan Novak',          phonetic: 'MEE-lahn',       position: 'GK', number: 13, avatarSeed: 'milan-novak' },
];
