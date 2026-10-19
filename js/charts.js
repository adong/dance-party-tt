/* TT Dance Party: the dance notes for each song, at both levels.
   A chart is built on the song's beat grid: every bar has 8 slots, one per eighth note, and a note in slot s of bar b
   lands exactly on that eighth note of the music (js/checks.js proves it, and that a drum or note of the song sounds
   right there). The patterns below are the hand-tuned part, one per section ('a' falls back to 'A').
     🐣 EASY (Tommy, 5): two big lanes, L and R, on the beats only, never two at once.
     🔥 NORMAL (Teddy, 8): four lanes L D U R (← ↓ ↑ →), eighth notes, X = ← and → together, and hold notes:
        a letter followed by = keeps the key down through those slots (the tail is the last =).
   No Three.js or page here, so tools/check.js can load it in node. */
(function () {
  'use strict';
  const DP = (window.DP = window.DP || {});

  const LEVELS = {
    easy: { id: 'easy', lanes: 2, travel: 2.4, windows: { perfect: 0.075, great: 0.14, ok: 0.21 }, gap: 0.4, canFail: false },
    normal: { id: 'normal', lanes: 4, travel: 1.7, windows: { perfect: 0.045, great: 0.09, ok: 0.135 }, gap: 0.2, canFail: true },
  };
  const LANE = { easy: { L: [0], R: [1] }, normal: { L: [0], D: [1], U: [2], R: [3], X: [0, 3] } };

  const CHARTS = {
    dino: {
      easy: {
        I: ['........', 'L...R...'],
        A: ['L...R...', 'L...R...', 'L...L...', 'R...R...'],
        B: ['L.R.L.R.', 'L...R...', 'L.R.L.R.', 'R.......'],
        O: ['L...R...', 'L.......'],
      },
      normal: {
        I: ['........', 'L...R...'],
        A: ['L.D.U.R.', 'L.L.R.R.', 'D.U.D.U.', 'L===R...'],
        a: ['L.D.U.R.', 'L.L.R.R.', 'D.U.D.U.', 'X...X...'],
        B: ['U.U.D.D.', 'L.R.L.R.', 'U...U...', 'D===X...'],
        O: ['L.D.U.R.', 'X.......'],
      },
    },
    icepop: {
      easy: {
        I: ['........', 'R...L...'],
        A: ['L...R...', 'L...R...', 'L.L.R.R.', 'L...R...'],
        B: ['R...R...', 'L...L...', 'R.L.R.L.', 'R...L...'],
        O: ['L...R...', 'R.......'],
      },
      normal: {
        I: ['........', 'L...R...'],
        A: ['L.U.R.U.', 'D...D.U.', 'L.R.L.R.', 'U===D...'],
        a: ['L.U.R.U.', 'D...D.U.', 'L.R.L.R.', 'X...X...'],
        B: ['L.LDR.RU', 'D===U...', 'L.R.L.R.', 'U.D.X...'],
        O: ['L.D.U.R.', 'X.......'],
      },
    },
    sunny: {
      easy: {
        I: ['........', 'L...R...'],
        A: ['L...R...', 'L...R...', 'L...L...', 'R...R...'],
        a: ['L...R...', 'L...R...', 'L.R.L.R.', 'L.......'],
        B: ['L.R.L.R.', 'L.R.L.R.', 'L...R...', 'L...R...'],
        O: ['L...R...', 'R.......'],
      },
      normal: {
        I: ['........', 'L.D.U.R.'],
        A: ['L.D.U.R.', 'U.U.D.D.', 'L.L.R.R.', 'U===D...'],
        a: ['L.D.U.R.', 'U.U.D.D.', 'L.RLR.L.', 'U===....'],
        B: ['L===R===', 'U.D.U.D.', 'L.R.U.D.', 'X...X...'],
        O: ['L.D.U.R.', 'X.......'],
      },
    },
    robot: {
      easy: {
        I: ['........', 'L...R...'],
        A: ['L...R...', 'R...L...', 'L...R...', 'L.......'],
        a: ['L...R...', 'L...R...', 'R...L...', 'R.......'],
        B: ['L.R.L.R.', 'L...R...', 'L.R.L.R.', 'R...R...'],
        O: ['L...R...', 'L.......'],
      },
      normal: {
        I: ['........', 'L...R...'],
        A: ['L.R.L.R.', 'U.D.U.D.', 'L.U.R.D.', 'L===R...'],
        a: ['L.R.L.R.', 'U.D.U.D.', 'LDUR....', 'X...X...'],
        B: ['U.U.U.D.', 'L.R.L.R.', 'U===D===', 'LRLR....'],
        O: ['L.D.U.R.', 'X.......'],
      },
    },
    fizz: {
      easy: {
        I: ['........', 'L...R...'],
        A: ['L...R...', 'L...R...', 'L...R...', 'L...R...'],
        a: ['L...L...', 'R...R...', 'L...R...', 'L.......'],
        B: ['L.R.L.R.', 'L...R...', 'L.R.L.R.', 'R.......'],
        b: ['L...R...', 'L...R...', 'L.R.L.R.', 'L.......'],
        O: ['L...R...', 'R.......'],
      },
      normal: {
        I: ['........', 'U...U...'],
        A: ['L.R.U.D.', 'L.R.U.D.', 'U===D===', 'L.R.L.R.'],
        a: ['L.L.R.R.', 'U.U.D.D.', 'LRLR....', 'X...X...'],
        B: ['U.L.R.D.', 'U.L.R.D.', 'L===R===', 'U.D.U.D.'],
        b: ['L.D.U.R.', 'R.U.D.L.', 'U===....', 'X.......'],
        O: ['L.R.L.R.', 'X.......'],
      },
    },
    rocket: {
      easy: {
        I: ['........', 'L.......'],
        A: ['L...R...', 'L...R...', 'L...R...', 'L...R...'],
        a: ['R...L...', 'R...L...', 'L.R.L.R.', 'L.......'],
        B: ['L...R...', 'L.R.L.R.', 'L...R...', 'L.R.L.R.'],
        O: ['L...R...', 'R.......'],
      },
      normal: {
        I: ['........', 'L...R...'],
        A: ['L.D.U.R.', 'L.D.U.R.', 'U.U.D.D.', 'L===R==='],
        a: ['R.U.D.L.', 'R.U.D.L.', 'L.R.L.R.', 'X...X...'],
        B: ['U===D===', 'L.R.U.D.', 'L.R.L.R.', 'U.D.X...'],
        O: ['L.D.U.R.', 'X.......'],
      },
    },
  };

  // Build the notes for one song and level: [{ id, t, lane, slot, tail (0 for a tap), tailSlot }], sorted by time.
  // `patterns` lets the checks feed in a broken chart.
  function build(song, level, patterns) {
    const lv = LEVELS[level];
    const pats = patterns || CHARTS[song.id][level];
    let slots = '';
    for (const sec of song.sections) {
      const bars = pats[sec.name] || pats[sec.name.toUpperCase()];
      if (!bars || bars.length !== sec.bars) throw new Error(`${song.id} ${level}: section ${sec.name} needs ${sec.bars} bars`);
      for (const b of bars) {
        if (b.length !== 8) throw new Error(`${song.id} ${level} ${sec.name}: "${b}" is not 8 slots`);
        slots += b;
      }
    }
    const eighth = song.spb / 2;
    const notes = [];
    for (let i = 0; i < slots.length; i++) {
      const ch = slots[i];
      if (ch === '.' || ch === '=') continue;
      const lanes = LANE[level][ch];
      if (!lanes) throw new Error(`${song.id} ${level}: "${ch}" isn't a ${level} note`);
      let tailSlot = i;
      while (slots[tailSlot + 1] === '=') tailSlot++;
      for (const lane of lanes) {
        notes.push({ id: notes.length, t: i * eighth, lane, slot: i, tail: tailSlot > i ? tailSlot * eighth : 0, tailSlot });
      }
    }
    notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
    notes.forEach((n, i) => (n.id = i));
    return { song, level: lv, notes };
  }

  // the song clock starts this long before the first beat, so the first notes can scroll in from the top
  const LEADIN = 1.4;

  DP.charts = { LEVELS, CHARTS, LEADIN, build };
})();
