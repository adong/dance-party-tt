/* TT Dance Party: the sound. Every song note and drum is a Kit.sound.tone / hiss, so the kit's sound switch (M, the
   speaker buttons, the ? panel) mutes the music too, and there are no audio files.
   To keep the dance notes in step with the music, songs are scheduled ahead on the AudioContext clock (`when`) by a
   small look-ahead scheduler that reads the song clock (js/clock.js). The kit doesn't hand out its AudioContext, so
   this file wraps the AudioContext constructor before the kit makes one (Kit.sound.init runs on the first tap or key,
   after every script has loaded) and keeps a reference. Nothing else about the kit's sound changes. */
(function () {
  'use strict';
  const DP = (window.DP = window.DP || {});
  const S = Kit.sound;

  const A = (DP.audio = { ctx: null });
  const Native = window.AudioContext || window.webkitAudioContext;
  if (Native) {
    const Wrapped = function (opts) {
      const c = opts ? new Native(opts) : new Native();
      A.ctx = c;
      return c;
    };
    Wrapped.prototype = Native.prototype;
    window.AudioContext = Wrapped;
    if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
  }
  A.running = () => !!A.ctx && A.ctx.state === 'running';
  A.source = () => (A.ctx ? { running: A.running(), t: A.ctx.currentTime } : null);

  // ------------------------------------------------------------------ the instruments
  const MUSIC = 0.3; // the songs' level against the effects (the kit's own loop plays at about this)

  function voice(e, when, song, m) {
    const v = MUSIC * m, acc = e.accent ? 1.15 : 1;
    const def = song.def;
    switch (e.kind) {
      case 'k':
        S.tone({ when, f: 150, to: 42, dur: 0.24, vol: 0.9 * v * acc });
        break;
      case 's':
        S.hiss({ when, f: 1900, dur: 0.16, vol: 0.4 * v, q: 0.7 });
        S.tone({ when, type: 'triangle', f: 200, to: 140, dur: 0.08, vol: 0.25 * v });
        break;
      case 'c':
        for (let i = 0; i < 3; i++) S.hiss({ when: when + i * 0.011, f: 1400, q: 1.3, dur: 0.02, vol: 0.32 * v * acc });
        S.hiss({ when: when + 0.033, f: 1300, q: 1, dur: 0.13, vol: 0.26 * v * acc });
        break;
      case 'h':
        S.hiss({ when, filter: 'highpass', f: 7500, dur: 0.04, vol: (e.accent ? 0.16 : 0.1) * v });
        break;
      case 'o':
        S.hiss({ when, filter: 'highpass', f: 6500, dur: 0.2, vol: 0.1 * v });
        break;
      case 'z':
        S.hiss({ when, filter: 'highpass', f: 9000, dur: 0.035, vol: 0.075 * v });
        break;
      case 'r':
        S.tone({ when, type: 'square', f: e.accent ? 1500 : 1250, dur: 0.025, vol: 0.06 * v * acc, lp: 5000 });
        S.tone({ when, f: e.accent ? 1000 : 820, dur: 0.06, vol: 0.2 * v * acc });
        break;
      case 't':
        S.tone({ when, f: e.alt ? 120 : 170, to: e.alt ? 70 : 100, dur: 0.28, vol: 0.55 * v });
        break;
      case 'y':
        S.hiss({ when, filter: 'highpass', f: 5200, to: 3000, dur: 1.4, vol: 0.24 * v });
        break;
      case 'bass': {
        const b = def.bassVoice;
        S.tone({ when, type: b.type, f: e.f, dur: Math.max(0.12, e.dur), vol: b.vol * v, lp: b.lp, attack: 0.006 });
        if (b.type === 'triangle') S.tone({ when, f: e.f / 2, dur: Math.max(0.12, e.dur), vol: b.vol * 0.5 * v }); // a soft sub
        break;
      }
      case 'keys': {
        const k = def.keysVoice;
        for (const f of e.fs) S.tone({ when, type: k.type, f, dur: e.dur, vol: k.vol * v * (e.pad ? 1.3 : 1), lp: k.lp, attack: e.pad ? 0.03 : 0.005 });
        break;
      }
      case 'arp': {
        const a = def.arpVoice;
        S.tone({ when, type: a.type, f: e.f, dur: Math.max(0.08, e.dur), vol: a.vol * v });
        break;
      }
      case 'lead': {
        const l = def.lead;
        const dur = Math.max(0.1, e.dur);
        if (l.type === 'bell') {
          S.tone({ when, f: e.f, dur: dur + 0.25, vol: l.vol * v });
          S.tone({ when, f: e.f * 2, dur: 0.25, vol: l.vol * 0.35 * v });
          S.tone({ when, f: e.f * 3.01, dur: 0.12, vol: l.vol * 0.12 * v });
        } else if (l.type === 'pluck') {
          S.tone({ when, type: 'triangle', f: e.f, dur: Math.min(dur, 0.32), vol: l.vol * v });
          S.tone({ when, f: e.f * 2, dur: 0.1, vol: l.vol * 0.3 * v });
        } else {
          S.tone({ when, type: l.type, f: e.f, dur, vol: l.vol * v, lp: l.lp, attack: 0.008 });
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ playing a song against a clock
  const AHEAD = 0.2; // schedule this far ahead

  // { start(song, clock, { vol, loop }), stop(), tick() }. While the song clock isn't on the audio clock (sound off,
  // suspended, paused) nothing is scheduled and the events that fall due are skipped, so nothing plays late.
  function player() {
    let song = null, clock = null, idx = 0, vol = 1, loop = null;
    const seekIdx = (t) => {
      let i = 0;
      while (i < song.events.length && song.events[i].t < t - 1e-6) i++;
      return i;
    };
    const P = {
      start(s, c, o = {}) {
        song = s; clock = c; vol = o.vol == null ? 1 : o.vol; loop = o.loop || null;
        idx = seekIdx(clock.now());
      },
      stop() { song = null; },
      playing: () => !!song,
      song: () => song,
      tick() {
        if (!song) return;
        let now = clock.now();
        if (loop && now >= loop.to) {
          clock.seek(loop.from + (now - loop.to));
          now = clock.now();
          idx = seekIdx(now);
        }
        const ev = song.events;
        if (!clock.onAudio() || !A.running()) {
          while (idx < ev.length && ev[idx].t < now + 0.02) idx++;
          return;
        }
        while (idx < ev.length && ev[idx].t < now + AHEAD) {
          const e = ev[idx++];
          if (e.t < now - 0.03) continue; // already gone by: never play anything late
          voice(e, clock.toAudio(e.t), song, vol);
        }
      },
    };
    return P;
  }
  A.player = player;

  // ------------------------------------------------------------------ effects
  A.sfx = {
    hit(rating) {
      if (rating === 'PERFECT') S.tone({ type: 'triangle', f: 1568, dur: 0.09, vol: 0.06 });
      else if (rating === 'GREAT') S.tone({ type: 'triangle', f: 1319, dur: 0.08, vol: 0.045 });
    },
    stumble() {
      S.tone({ type: 'square', f: 300, to: 150, dur: 0.16, vol: 0.05, lp: 1200 });
      S.tone({ f: 160, to: 90, dur: 0.14, vol: 0.12, at: 0.02 });
    },
    hold() { S.tone({ f: 1046, to: 1568, dur: 0.14, vol: 0.06 }); },
    combo(n) {
      const k = Math.min(n / 50, 1);
      [784, 988, 1175, 1568].forEach((f, i) => S.tone({ type: 'triangle', f: f * (1 + k * 0.25), at: i * 0.05, dur: 0.14, vol: 0.06 }));
    },
    cheer(big) {
      S.hiss({ f: 1100, q: 0.4, dur: big ? 1.6 : 0.9, vol: big ? 0.16 : 0.09, attack: 0.25 });
      S.hiss({ filter: 'highpass', f: 3500, dur: big ? 1.2 : 0.6, vol: 0.05, attack: 0.2 });
    },
    buddy() { S.jump(); S.powerup(); },
    treat() { S.coin(6); },
    fanfare(stars) {
      const notes = stars >= 3 ? [523, 659, 784, 1047, 1319] : stars >= 1 ? [523, 659, 784, 1047] : [392, 494, 587];
      notes.forEach((f, i) => S.tone({ type: 'square', f, at: i * 0.11, dur: 0.22, vol: 0.05, lp: 3000 }));
      notes.forEach((f, i) => S.tone({ type: 'triangle', f: f / 2, at: i * 0.11, dur: 0.22, vol: 0.12 }));
    },
    pop() { S.hiss({ filter: 'highpass', f: 2500, dur: 0.08, vol: 0.08 }); },
    star(i) { S.tone({ type: 'triangle', f: 880 * Math.pow(1.26, i), dur: 0.25, vol: 0.12 }); },
    tap() { S.tone({ type: 'square', f: 660, dur: 0.04, vol: 0.04, lp: 3000 }); },
    click() { S.click(); },
  };
})();
