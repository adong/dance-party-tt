/* TT Dance Party: the songs. Six of our own, composed here as data and compiled to a list of timed sound events
   (no audio files, no covers). js/audio.js plays the events through Kit.sound.tone / hiss, so the kit's sound switch
   mutes them, and js/charts.js puts the dance notes on the same beat grid.

   How a song is written:
     bpm, key ('E'), scale ('major' | 'minor'), and a form like 'I A a B A B O': I is the intro (a count-in bar, then
     the groove), O the ending (a bar, then the final hit). Each section has one chord per bar ('Em', or two in a bar:
     'Am Dm'), and per bar the name of a drum, bass and keys pattern (lists cycle).
     Drums, bass and keys patterns are 16 steps (sixteenth notes) per bar:
       drums  k kick, s snare, c clap, h hat, o open hat, z shaker, r rim click, t tom, y cymbal; capital = louder.
       bass   1 3 5 8 = root, third, fifth, octave of the chord (4 = fourth, 6 = sixth, 7 = flat seventh), - holds, . rests.
       keys   x a short chord stab, P a chord held until the next symbol.
     The lead is one string per bar: 8 (or 16) tokens, each a scale degree 1-7 (' an octave up, , an octave down,
     # or b to bend it), - to hold, . to rest.
   No Three.js or page here, so tools/check.js can load it in node. */
(function () {
  'use strict';
  const DP = (window.DP = window.DP || {});

  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const BASS_IV = { 1: 0, 2: 2, 4: 5, 5: 7, 6: 9, 7: 10, 8: 12 }; // '3' is the chord's own third
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function chord(sym) {
    const m = /^([A-G])([b#]?)(.*)$/.exec(sym);
    if (!m) throw new Error('bad chord ' + sym);
    const pc = (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
    const q = m[3];
    const minor = q.startsWith('m') && !q.startsWith('maj');
    const tones = [0, minor ? 3 : 4, 7];
    if (q.endsWith('7')) tones.push(q.includes('maj7') ? 11 : 10);
    return { sym, pc, tones, third: tones[1] };
  }

  // a melody token: "5", "1'", "5,", "#7", "b3'" -> midi, from the song's key and scale
  function degree(tok, song) {
    const m = /^([b#]?)([1-7])([',]*)$/.exec(tok);
    if (!m) throw new Error(`bad note ${tok} in ${song.id}`);
    let n = song.lead.root + SCALES[song.scale][+m[2] - 1] + (m[1] === '#' ? 1 : m[1] === 'b' ? -1 : 0);
    for (const c of m[3]) n += c === "'" ? 12 : -12;
    return n;
  }

  // ------------------------------------------------------------------ the six songs

  const COUNT = { r: 'X...x...x...x...', k: 'x...............' };
  const END = { k: 'X...............', y: 'X...............', c: 'x...............' };
  const vary = (sec, o) => Object.assign({}, sec, o);

  // 🦖 a big stompy one, slow and heavy: half the beats are stomps, low saw bass riff, toms in the fills
  const DINO_A = {
    chords: ['Em', 'Em', 'C', 'D'], drums: ['stomp', 'stomp', 'stomp', 'fill'], bass: ['riff'], keys: ['hit'],
    lead: ['1 . 3 . 5 . . .', '5 . 3 . 2 1 . .', "1' . 7 . 5 . 3 .", '2 . 4 . 2 . 7, .'],
  };
  const DINO_B = {
    chords: ['Am', 'Em', 'C', 'D'], drums: ['stomp2', 'stomp2', 'stomp2', 'fill'], bass: ['roar'], keys: ['hit'],
    lead: ['4 . 4 . 6 . 4 .', '5 . 5 . 3 . 1 .', '3 . 3 . 5 . 6 .', '7 - . 6 5 - 4 .'],
  };
  const dino = {
    id: 'dino', name: 'Dino Stomp', emoji: '🦖', bpm: 90, key: 'E', scale: 'minor', tile: '#7ed957',
    lead: { root: 64, type: 'square', lp: 1500, vol: 0.05 }, bassVoice: { type: 'sawtooth', lp: 420, vol: 0.34, oct: 28 },
    keysVoice: { type: 'triangle', lp: 1400, vol: 0.05, oct: 52 },
    drums: {
      count: COUNT, end: END,
      stomp: { k: 'X..x..x.X.......', c: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
      stomp2: { k: 'X..x..x.X..x....', c: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', t: '..............x.' },
      fill: { k: 'X..x..x.........', c: '....x...........', h: 'x.x.x.x.........', t: '........X.x.TtTt' },
    },
    bass: { riff: '1..1..3.1..5.43.', roar: '1-----1-5-----8-', end: '1---------------' },
    keys: { hit: 'x.......x.......', end: 'P...............' },
    sections: {
      I: { chords: ['Em', 'Em'], drums: ['count', 'stomp'], bass: [null, 'riff'], keys: null, lead: null },
      A: DINO_A,
      a: vary(DINO_A, { lead: DINO_A.lead.slice(0, 3).concat(['2 . 4 . 5 - - .']) }),
      B: DINO_B,
      O: { chords: ['Em', 'Em'], drums: ['stomp', 'end'], bass: ['riff', 'end'], keys: ['hit', 'end'], lead: ["1 . 3 . 5 . 1' .", "1' - - - . . . ."] },
    },
    form: 'I A a B A B O',
  };

  // 🍦 a wiggly, toy-box one: bell melody, rim clicks like a wood block, a round bouncy bass
  const ICE_A = {
    chords: ['F', 'Dm', 'Bb', 'C'], drums: ['wiggle', 'wiggle', 'wiggle', 'fill'], bass: ['bounce'], keys: ['skip'],
    lead: ["1 3 5 3 1' . 5 .", '6 . 5 . 3 . 2 .', "4 . 6 . 1' . 6 .", '5 - 3 - 2 . . .'],
  };
  const ICE_B = {
    chords: ['Bb', 'C', 'Am Dm', 'Gm C'], drums: ['wiggle2', 'wiggle2', 'wiggle2', 'fill'], bass: ['walk'], keys: ['skip'],
    lead: ["1' . 1' . 6 . 4 .", '7 . 7 . 5 . 3 .', "3 . 5 . 6 . 1' .", '2 . 4 . 5 - 7 .'],
  };
  const ice = {
    id: 'icepop', name: 'Ice Pop Wiggle', emoji: '🍦', bpm: 96, key: 'F', scale: 'major', tile: '#ff8fc8',
    lead: { root: 65, type: 'bell', vol: 0.11 }, bassVoice: { type: 'triangle', vol: 0.42, oct: 29 },
    keysVoice: { type: 'triangle', lp: 2200, vol: 0.045, oct: 57 },
    drums: {
      count: COUNT, end: END,
      wiggle: { k: 'X.....x...x.....', c: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', r: '..x.......x..x..' },
      wiggle2: { k: 'X.....x...x.....', c: '....x.......x...', z: 'xxxxxxxxxxxxxxxx', o: '..x...x...x...x.', r: '...x.......x....' },
      fill: { k: 'X.....x.........', c: '....x.......x.xx', h: 'x.x.x.x.x.x.....', r: '........x.x.x...' },
    },
    bass: { bounce: '1..5..8.1..5..8.', walk: '1...5...8...5...', end: '1---------------' },
    keys: { skip: '..x...x...x...x.', end: 'P...............' },
    sections: {
      I: { chords: ['F', 'F'], drums: ['count', 'wiggle'], bass: [null, 'bounce'], keys: null, lead: null },
      A: ICE_A,
      a: vary(ICE_A, { lead: ICE_A.lead.slice(0, 3).concat(["5 . 6 . 7 . 1' ."]) }),
      B: ICE_B,
      O: { chords: ['F', 'F'], drums: ['wiggle', 'end'], bass: ['bounce', 'end'], keys: ['skip', 'end'], lead: ["1' . 5 . 3 . 5 .", "1' - - - . . . ."] },
    },
    form: 'I A a B A B O',
  };

  // 🌻 the theme song: sunny, bouncy, a little funky. Chip-tune lead, octave bass, chords on the off-beats
  const SUN_A = {
    chords: ['C', 'Am', 'F', 'G'], drums: ['groove', 'groove', 'groove', 'fill'], bass: ['funk'], keys: ['skank'],
    lead: ['5 . 5 6 5 . 3 .', "6 . 1' 6 5 . 3 .", '4 . 4 5 6 . 5 4', '5 - - . 2 . 3 .'],
  };
  const SUN_B = {
    chords: ['F', 'G', 'Em', 'Am'], drums: ['groove2', 'groove2', 'groove2', 'fill'], bass: ['push'], keys: ['skank'],
    lead: ["1' . 1' . 6 . 1' .", "2' . 2' . 7 . 5 .", "3' - 2' - 1' . 7 .", '6 - - - 5 . 3 .'],
  };
  const sunny = {
    id: 'sunny', name: 'Sunny Backyard', emoji: '🌻', bpm: 104, key: 'C', scale: 'major', tile: '#ffd400',
    lead: { root: 60, type: 'square', lp: 2600, vol: 0.05 }, bassVoice: { type: 'sawtooth', lp: 700, vol: 0.3, oct: 28 },
    keysVoice: { type: 'square', lp: 1800, vol: 0.03, oct: 55 },
    drums: {
      count: COUNT, end: END,
      groove: { k: 'X.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
      groove2: { k: 'X.....x.x.....x.', s: '....x.......x...', c: '....x.......x...', o: '..x...x...x...x.', h: 'x...x...x...x...' },
      fill: { k: 'X.....x.x.......', s: '....x.......xxxx', h: 'x.x.x.x.x.x.....' },
    },
    bass: { funk: '1.18.1..5.8.1.5.', push: '1..1..1.5..5..5.', end: '1---------------' },
    keys: { skank: '..x...x...x...x.', end: 'P...............' },
    sections: {
      I: { chords: ['C', 'C'], drums: ['count', 'groove'], bass: [null, 'funk'], keys: null, lead: null },
      A: SUN_A,
      a: vary(SUN_A, { lead: SUN_A.lead.slice(0, 3).concat(['2 . 3 . 1 - - .']) }),
      B: SUN_B,
      O: { chords: ['C', 'C'], drums: ['groove', 'end'], bass: ['funk', 'end'], keys: ['skank', 'end'], lead: ["5 . 3 . 5 . 1' .", "1' - - - . . . ."] },
    },
    form: 'I A a B B A B O',
  };

  // 🤖 beepy and stiff, like a robot learning to dance: square bass bouncing in octaves, bleeps, a sixteenth arp
  const ROBOT_A = {
    chords: ['Am', 'F', 'C', 'G'], drums: ['robot', 'robot', 'robot', 'fill'], bass: ['octo'], keys: ['blip'],
    lead: ['1 . 1 . 3 . 5 .', '6 . 5 . 3 . 1 .', "3 . 5 . 1' . 7 .", '7 - 5 - 2 . . .'],
  };
  const ROBOT_B = {
    chords: ['Dm', 'Am', 'F', 'E'], drums: ['robot2', 'robot2', 'robot2', 'fill'], bass: ['octo5'], keys: ['blip'], arp: true,
    lead: ["4 . 6 . 4 . 1' .", '3 . 1 . 5 . 3 .', "6 . 1' . 3' . 1' .", '#7 - - . 5 . 2 .'],
  };
  const robot = {
    id: 'robot', name: 'Beep Boop Robot', emoji: '🤖', bpm: 116, key: 'A', scale: 'minor', tile: '#18d4ff',
    lead: { root: 69, type: 'square', lp: 3200, vol: 0.04 }, bassVoice: { type: 'square', lp: 900, vol: 0.2, oct: 33 },
    keysVoice: { type: 'square', lp: 2400, vol: 0.025, oct: 57 }, arpVoice: { type: 'triangle', vol: 0.06, oct: 69 },
    drums: {
      count: COUNT, end: END,
      robot: { k: 'X...x...x...x...', c: '....x.......x...', h: '..x...x...x...x.' },
      robot2: { k: 'X...x...x...x...', c: '....x.......x...', o: '..x...x...x...x.', z: 'x.x.x.x.x.x.x.x.' },
      fill: { k: 'X...x...x.x.x.x.', c: '....x.......x.xx', h: '..x...x.........' },
    },
    bass: { octo: '1.8.1.8.1.8.1.8.', octo5: '1.8.1.8.5.8.5.8.', end: '1---------------' },
    keys: { blip: 'x.....x.....x...', end: 'P...............' },
    sections: {
      I: { chords: ['Am', 'Am'], drums: ['count', 'robot'], bass: [null, 'octo'], keys: null, lead: null },
      A: ROBOT_A,
      a: vary(ROBOT_A, { lead: ROBOT_A.lead.slice(0, 3).concat(["7 . 7 . 2' . 7 ."]) }),
      B: ROBOT_B,
      O: { chords: ['Am', 'Am'], drums: ['robot', 'end'], bass: ['octo', 'end'], keys: ['blip', 'end'], lead: ["1 . 3 . 5 . 1' .", "1' - - - . . . ."] },
    },
    form: 'I A a B A a B B O',
  };

  // 🫧 sparkly pop: plucky lead, a sixteenth arpeggio like popping bubbles, claps and shakers
  const FIZZ_A = {
    chords: ['G', 'D', 'Em', 'C'], drums: ['pop', 'pop', 'pop', 'fill'], bass: ['pump'], keys: ['stab'], arp: true,
    lead: ["5 . 5 . 3 5 . 1'", "2' . 2' . 7 . 5 .", "3' . 2' . 1' . 7 .", '6 - 5 - 1 . . .'],
  };
  const FIZZ_B = {
    chords: ['C', 'D', 'Bm', 'Em'], drums: ['pop2', 'pop2', 'pop2', 'fill'], bass: ['hop'], keys: ['stab'], arp: true,
    lead: ["1' . 1' . 6 . 1' .", "2' . 2' . 7 . 2' .", "3' - 2' - 7 . 5 .", "3' - - - . . 5 6"],
  };
  const fizz = {
    id: 'fizz', name: 'Bubble Fizz', emoji: '🫧', bpm: 126, key: 'G', scale: 'major', tile: '#9b6bff',
    lead: { root: 67, type: 'pluck', vol: 0.12 }, bassVoice: { type: 'sawtooth', lp: 650, vol: 0.26, oct: 31 },
    keysVoice: { type: 'triangle', lp: 2400, vol: 0.04, oct: 59 }, arpVoice: { type: 'sine', vol: 0.07, oct: 79 },
    drums: {
      count: COUNT, end: END,
      pop: { k: 'X.....x.x.......', c: '....x.......x...', z: 'x.x.x.x.x.x.x.x.' },
      pop2: { k: 'X...x...x...x...', c: '....x.......x...', z: 'xxxxxxxxxxxxxxxx', o: '..x...x...x...x.' },
      fill: { k: 'X...x...x...x...', c: '....x...x.x.xxxx', z: 'x.x.x.x.........' },
    },
    bass: { pump: '1.1.1.1.1.1.1.1.', hop: '1..1..1.5..5..5.', end: '1---------------' },
    keys: { stab: 'x.....x.....x...', end: 'P...............' },
    sections: {
      I: { chords: ['G', 'G'], drums: ['count', 'pop'], bass: [null, 'pump'], keys: null, lead: null },
      A: FIZZ_A,
      a: vary(FIZZ_A, { lead: FIZZ_A.lead.slice(0, 3).concat(["6 . 7 . 1' - - ."]) }),
      B: FIZZ_B,
      b: vary(FIZZ_B, { chords: ['C', 'D', 'G', 'G'], lead: FIZZ_B.lead.slice(0, 2).concat(["1' . 5 . 3 . 1 .", "1' - - - . . . ."]) }),
      O: { chords: ['G', 'G'], drums: ['pop', 'end'], bass: ['pump', 'end'], keys: ['stab', 'end'], lead: ["5 . 3 . 5 . 1' .", "1' - - - . . . ."] },
    },
    form: 'I A a B b A B b O',
  };

  // 🚀 the fast one: four-on-the-floor disco, octave bass, open hats on the off-beats, zappy lead
  const ROCKET_A = {
    chords: ['Dm', 'Gm', 'C', 'F'], drums: ['disco', 'disco', 'disco', 'fill'], bass: ['disco'], keys: ['strings'],
    lead: ["1' . 5 . 3 . 5 .", "4 . 6 . 1' . 6 .", "7 . 2' . 3' . 2' .", "3 - 5 - 7 - 1' ."],
  };
  const ROCKET_B = {
    chords: ['Bb', 'C', 'Am', 'Dm'], drums: ['disco2', 'disco2', 'disco2', 'fill'], bass: ['disco5'], keys: ['strings'],
    lead: ["6 . 1' . 3' . 1' .", "7 . 2' . 4' . 2' .", "5 . 7 . 2' . 7 .", "1' - - . 5 . 3 ."],
  };
  const rocket = {
    id: 'rocket', name: 'Rocket Disco', emoji: '🚀', bpm: 138, key: 'D', scale: 'minor', tile: '#ff8a1f',
    lead: { root: 62, type: 'square', lp: 2800, vol: 0.045 }, bassVoice: { type: 'sawtooth', lp: 800, vol: 0.28, oct: 26 },
    keysVoice: { type: 'sawtooth', lp: 1600, vol: 0.022, oct: 57 },
    drums: {
      count: COUNT, end: END,
      disco: { k: 'X...x...x...x...', c: '....x.......x...', o: '..x...x...x...x.', h: 'x.x.x.x.x.x.x.x.' },
      disco2: { k: 'X...x...x...x...', s: '....x.......x...', c: '....x.......x...', o: '..x...x...x...x.', z: 'xxxxxxxxxxxxxxxx' },
      fill: { k: 'X...x...x...x...', s: '....x...x.xxxxxx', o: '..x...x.........' },
    },
    bass: { disco: '1.8.1.8.1.8.1.8.', disco5: '1.8.5.8.1.8.5.8.', end: '1---------------' },
    keys: { strings: '..x...x...x...x.', end: 'P...............' },
    sections: {
      I: { chords: ['Dm', 'Dm'], drums: ['count', 'disco'], bass: [null, 'disco'], keys: null, lead: null },
      A: ROCKET_A,
      a: vary(ROCKET_A, { lead: ROCKET_A.lead.slice(0, 3).concat(["3' - 2' - 1' . . ."]) }),
      B: ROCKET_B,
      O: { chords: ['Dm', 'Dm'], drums: ['disco', 'end'], bass: ['disco', 'end'], keys: ['strings', 'end'], lead: ["1' . 5 . 3 . 5 .", "1' - - - . . . ."] },
    },
    form: 'I A a B B A a B B O',
  };

  // The tap-along track for the timing screen: a count-in bar, then a plain kick and clap on every beat.
  const calib = {
    id: 'calib', name: 'Timing', emoji: '🎧', bpm: 100, key: 'C', scale: 'major', tile: '#ffffff',
    lead: { root: 72, type: 'bell', vol: 0.1 }, bassVoice: { type: 'triangle', vol: 0.3, oct: 36 },
    drums: { count: COUNT, tap: { k: 'X...X...X...X...', c: 'x...x...x...x...' } },
    bass: {}, keys: {},
    sections: { I: { chords: ['C'], drums: ['count'], lead: null }, T: { chords: ['C', 'C', 'C', 'C'], drums: ['tap'], lead: null } },
    form: 'I T',
  };

  // ------------------------------------------------------------------ compile a song to timed events

  const pick = (list, i) => (list && list.length ? list[i % list.length] : null);

  // Turn "x-..P--." style patterns into [{ step, len }] (len in steps; a note lasts through its "-" steps).
  function runs(pat, isNote) {
    const out = [];
    for (let s = 0; s < pat.length; s++) {
      const ch = pat[s];
      if (ch === '.' || ch === '-') continue;
      if (!isNote(ch)) throw new Error('bad pattern char ' + ch + ' in ' + pat);
      let len = 1;
      while (s + len < pat.length && pat[s + len] === '-') len++;
      out.push({ step: s, len, ch });
    }
    return out;
  }

  function compile(song) {
    const spb = 60 / song.bpm, step = spb / 4, barDur = spb * 4;
    const events = [];
    const sections = [];
    const form = song.form.split(/\s+/);
    let bar = 0;
    const add = (e) => events.push(e);
    for (const name of form) {
      const sec = song.sections[name];
      if (!sec) throw new Error(`${song.id}: no section ${name}`);
      const bars = sec.chords.length;
      sections.push({ name, bar, bars, t: bar * barDur });
      for (let b = 0; b < bars; b++, bar++) {
        const t0 = bar * barDur;
        const at = (s) => t0 + s * step;
        const chordsHere = sec.chords[b].split(/\s+/).map(chord);
        const chordAt = (s) => chordsHere[Math.floor(s / (16 / chordsHere.length))];
        // drums
        const dk = pick(sec.drums, b);
        const dp = dk && song.drums[dk];
        if (dk && !dp) throw new Error(`${song.id}: no drum pattern ${dk}`);
        if (dp) {
          for (const inst of Object.keys(dp)) {
            const pat = dp[inst];
            if (pat.length !== 16) throw new Error(`${song.id} ${dk}.${inst}: ${pat.length} steps`);
            for (let s = 0; s < 16; s++) {
              const ch = pat[s];
              if (ch === '.') continue;
              add({ t: at(s), kind: inst.toLowerCase(), accent: ch === ch.toUpperCase() && ch !== ch.toLowerCase(), alt: ch === 'T' });
            }
          }
        }
        // bass
        const bk = pick(sec.bass, b);
        if (bk) {
          const pat = song.bass[bk];
          if (!pat || pat.length !== 16) throw new Error(`${song.id}: bass ${bk}`);
          for (const r of runs(pat, (c) => c === '3' || c in BASS_IV)) {
            const ch = chordAt(r.step);
            let root = song.bassVoice.oct + ((ch.pc - song.bassVoice.oct) % 12 + 12) % 12;
            const iv = r.ch === '3' ? ch.third : BASS_IV[r.ch];
            add({ t: at(r.step), kind: 'bass', f: hz(root + iv), dur: r.len * step * 0.92 });
          }
        }
        // keys (chords)
        const kk = pick(sec.keys, b);
        if (kk && song.keysVoice) {
          const pat = song.keys[kk];
          if (!pat || pat.length !== 16) throw new Error(`${song.id}: keys ${kk}`);
          for (const r of runs(pat, (c) => c === 'x' || c === 'P')) {
            const ch = chordAt(r.step);
            const base = song.keysVoice.oct + ((ch.pc - song.keysVoice.oct) % 12 + 12) % 12;
            const len = r.ch === 'P' ? (16 - r.step) * step : Math.max(1.5, r.len) * step;
            add({ t: at(r.step), kind: 'keys', fs: ch.tones.slice(0, 3).map((iv) => hz(base + iv)), dur: len, pad: r.ch === 'P' });
          }
        }
        // arpeggio: chord tones going up in sixteenths
        if (sec.arp && song.arpVoice) {
          for (let s = 0; s < 16; s++) {
            const ch = chordAt(s);
            const base = song.arpVoice.oct + ((ch.pc - song.arpVoice.oct) % 12 + 12) % 12;
            const tones = [0, ch.tones[1], 7, 12];
            add({ t: at(s), kind: 'arp', f: hz(base + tones[s % 4]), dur: step * 0.9 });
          }
        }
        // lead
        const line = sec.lead && sec.lead[b];
        if (line) {
          const toks = line.trim().split(/\s+/);
          if (toks.length !== 8 && toks.length !== 16) throw new Error(`${song.id} ${name} bar ${b}: ${toks.length} tokens`);
          const per = 16 / toks.length;
          for (let i = 0; i < toks.length; i++) {
            const tok = toks[i];
            if (tok === '.' || tok === '-') continue;
            let len = 1;
            while (i + len < toks.length && toks[i + len] === '-') len++;
            add({ t: at(i * per), kind: 'lead', f: hz(degree(tok, song)), dur: len * per * step * 0.9 });
          }
        }
      }
    }
    events.sort((a, b) => a.t - b.t);
    const last = sections[sections.length - 1];
    const finalHit = (last.bar + last.bars - 1) * barDur; // the ending's last bar starts with the final hit
    return {
      id: song.id, name: song.name, emoji: song.emoji, bpm: song.bpm, tile: song.tile, def: song,
      spb, step, barDur, bars: bar, events, sections, finalHit,
      end: finalHit + spb * 3, // the results come up while the last chord rings
      notesFrom: barDur, // the count-in bar never has notes
    };
  }

  const LIST = [dino, ice, sunny, robot, fizz, rocket];
  DP.songs = {
    list: LIST.map(compile),
    calib: compile(calib),
    compile, chord, hz, SCALES,
    get: (id) => DP.songs.list.find((s) => s.id === id) || null,
  };
})();
