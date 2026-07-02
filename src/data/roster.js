// roster.js — synthetic sample data for the prototype.
//
// INVENTED names for a fictional Under-23 squad, paired with placeholder face photos
// loaded at runtime from a prototyping avatar service (i.pravatar.cc). Those are stand-in
// faces of adults from a placeholder set — NOT real students, NOT minors. In the real
// app, `photo` is replaced by a school-authorized student photo stored locally on the
// teacher's device. `avatarSeed` is kept as an offline fallback (see avatar.js).
//
//   photo: real image URL, loaded in the browser at runtime (nothing is bundled)

window.NameDeck = window.NameDeck || {};

function pravatar(n) { return 'https://i.pravatar.cc/300?img=' + n; }

NameDeck.roster = [
  { id: 'p01', preferredName: 'Mateo',    legalName: 'Mateo Alvarez',    phonetic: 'mah-TAY-oh',  position: 'FW', number: 9,  avatarSeed: 'mateo-alvarez',    photo: pravatar(11) },
  { id: 'p02', preferredName: 'Kenji',    legalName: 'Kenji Nakamura',   phonetic: 'KEN-jee',     position: 'MF', number: 8,  avatarSeed: 'kenji-nakamura',   photo: pravatar(12) },
  { id: 'p03', preferredName: 'Amara',    legalName: 'Amara Okafor',     phonetic: 'ah-MAH-rah',  position: 'DF', number: 4,  avatarSeed: 'amara-okafor',     photo: pravatar(5)  },
  { id: 'p04', preferredName: 'Léo',      legalName: 'Léo Dubois',       phonetic: 'LAY-oh',      position: 'MF', number: 10, avatarSeed: 'leo-dubois',       photo: pravatar(13) },
  { id: 'p05', preferredName: 'Saoirse',  legalName: 'Saoirse Byrne',    phonetic: 'SUR-shuh',    position: 'FW', number: 11, avatarSeed: 'saoirse-byrne',    photo: pravatar(9)  },
  { id: 'p06', preferredName: 'Dmitri',   legalName: 'Dmitri Volkov',    phonetic: 'DMEE-tree',   position: 'GK', number: 1,  avatarSeed: 'dmitri-volkov',    photo: pravatar(14) },
  { id: 'p07', preferredName: 'Chidi',    legalName: 'Chidi Eze',        phonetic: 'CHEE-dee',    position: 'DF', number: 3,  avatarSeed: 'chidi-eze',        photo: pravatar(15) },
  { id: 'p08', preferredName: 'Ravi',     legalName: 'Ravi Chandran',    phonetic: 'RAH-vee',     position: 'MF', number: 6,  avatarSeed: 'ravi-chandran',    photo: pravatar(33) },
  { id: 'p09', preferredName: 'Nikoloz',  legalName: 'Nikoloz Beridze',  phonetic: 'nee-koh-LOZ', position: 'DF', number: 5,  avatarSeed: 'nikoloz-beridze',  photo: pravatar(51) },
  { id: 'p10', preferredName: 'Thabo',    legalName: 'Thabo Molefe',     phonetic: 'TAH-boh',     position: 'FW', number: 7,  avatarSeed: 'thabo-molefe',     photo: pravatar(59) },
  { id: 'p11', preferredName: 'Youssef',  legalName: 'Youssef El-Amin',  phonetic: 'YOO-sef',     position: 'MF', number: 14, avatarSeed: 'youssef-elamin',   photo: pravatar(52) },
  { id: 'p12', preferredName: 'Bjørn',    legalName: 'Bjørn Halvorsen',  phonetic: 'BYURN',       position: 'DF', number: 2,  avatarSeed: 'bjorn-halvorsen',  photo: pravatar(3)  },
  { id: 'p13', preferredName: 'Iker',     legalName: 'Iker Etxeberria',  phonetic: 'EE-kair',     position: 'GK', number: 12, avatarSeed: 'iker-etxeberria',  photo: pravatar(53) },
  { id: 'p14', preferredName: 'Tariq',    legalName: 'Tariq Hassan',     phonetic: 'TAH-rik',     position: 'FW', number: 17, avatarSeed: 'tariq-hassan',     photo: pravatar(60) },
  { id: 'p15', preferredName: 'Joon-ho',  legalName: 'Kim Joon-ho',      phonetic: 'JOON-hoh',    position: 'MF', number: 16, avatarSeed: 'joonho-kim',       photo: pravatar(68) },
  { id: 'p16', preferredName: 'Andrés',   legalName: 'Andrés Restrepo',  phonetic: 'ahn-DRESS',   position: 'DF', number: 15, avatarSeed: 'andres-restrepo',  photo: pravatar(56) },
  { id: 'p17', preferredName: 'Emeka',    legalName: 'Emeka Nwosu',      phonetic: 'eh-MEH-kah',  position: 'MF', number: 18, avatarSeed: 'emeka-nwosu',      photo: pravatar(58) },
  { id: 'p18', preferredName: 'Lucas',    legalName: 'Lucas Ferreira',   phonetic: 'LOO-kas',     position: 'FW', number: 19, avatarSeed: 'lucas-ferreira',   photo: pravatar(57) },
  { id: 'p19', preferredName: 'Sana',     legalName: 'Sana Qureshi',     phonetic: 'SAH-nah',     position: 'DF', number: 20, avatarSeed: 'sana-qureshi',     photo: pravatar(44) },
  { id: 'p20', preferredName: 'Milan',    legalName: 'Milan Novak',      phonetic: 'MEE-lahn',    position: 'GK', number: 13, avatarSeed: 'milan-novak',      photo: pravatar(54) },
];
