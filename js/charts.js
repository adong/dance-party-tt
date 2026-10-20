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

  // A small seeded random number generator (mulberry32), so a shuffled chart can be rebuilt from its seed.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // New arrows for the same rhythm, different every time you dance. The rules keep it playable and lively:
  //   - a lane is free only when its last note (or hold tail) is far enough back, and a hand that's holding a note
  //     gets nothing until 0.2 s after the tail (with two thumbs on a tablet, ← ↓ are the left hand, ↑ → the right);
  //   - 🔥 NORMAL never repeats the last arrow and prefers one that wasn't the arrow before either, so any three
  //     arrows in a row are usually all different; a jump (X) is one arrow for each hand;
  //   - 🐣 EASY picks left or right at random, but never more than 3 on the same side in a row.
  function shuffle(notes, lv, seed) {
    const rand = rng(seed);
    const hand = (lane) => (lv.lanes === 2 ? lane : lane < 2 ? 0 : 1);
    const lastEnd = [-9, -9, -9, -9], handT = [-9, -9], busy = [-9, -9];
    const recent = []; // lanes of the last single notes, newest last
    const pick = (cands) => {
      if (!cands.length) return null;
      const w = cands.map((l) => {
        if (lv.lanes === 2) {
          const run = recent.slice(-3);
          return run.length === 3 && run.every((x) => x === l) ? 0 : 1;
        }
        if (l === recent[recent.length - 1]) return 0;
        return l === recent[recent.length - 2] ? 0.3 : 1;
      });
      const total = w.reduce((a, b) => a + b, 0);
      if (!total) return cands[Math.floor(rand() * cands.length)];
      let r = rand() * total;
      for (let i = 0; i < cands.length; i++) if ((r -= w[i]) < 0) return cands[i];
      return cands[cands.length - 1];
    };
    const free = (lane, t) => t - lastEnd[lane] >= lv.gap - 1e-6 && t > busy[hand(lane)] + 1e-6 && t - handT[hand(lane)] >= 0.2 - 1e-6;
    const out = [];
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const jump = notes[i + 1] && notes[i + 1].slot === n.slot;
      let lanes;
      if (jump) {
        i++;
        lanes = [pick([0, 1].filter((l) => free(l, n.t))), pick([2, 3].filter((l) => free(l, n.t)))].filter((l) => l != null);
        if (!lanes.length) lanes = [n.lane];
      } else {
        const l = pick([...Array(lv.lanes).keys()].filter((x) => free(x, n.t)));
        lanes = [l == null ? n.lane : l];
        recent.push(lanes[0]);
      }
      for (const lane of lanes) {
        out.push(Object.assign({}, n, { lane }));
        lastEnd[lane] = n.tail || n.t;
        handT[hand(lane)] = n.t;
        if (n.tail) busy[hand(lane)] = n.tail + 0.2;
      }
    }
    return out;
  }

  // Build the notes for one song and level: [{ id, t, lane, slot, tail (0 for a tap), tailSlot }], sorted by time.
  // The rhythm (which eighth notes have arrows, the holds and the jumps) always comes from the patterns above. With a
  // `seed`, the arrows are shuffled (the game does that every time); without, they're the patterns' own.
  // `patterns` lets the checks feed in a broken chart.
  function build(song, level, patterns, seed) {
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
    let notes = [];
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
    if (seed != null) notes = shuffle(notes, lv, seed);
    notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
    notes.forEach((n, i) => (n.id = i));
    return { song, level: lv, notes, seed: seed == null ? null : seed };
  }

  // the song clock starts this long before the first beat, so the first notes can scroll in from the top
  const LEADIN = 1.4;

  DP.charts = { LEVELS, CHARTS, LEADIN, build };
})();
