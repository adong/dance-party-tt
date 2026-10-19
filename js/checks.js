/* TT Dance Party: the headless checks. Nobody can listen while the game is being built, so the sync is proved in code:
     grid       every note (and hold tail) sits on the song's eighth-note grid to within 1 ms, and a drum or note of
                the music sounds at that moment; nothing in the count-in bar or after the final hit
     playable   no impossible notes: same lane far enough apart, nothing on the same hand during a hold or at the same
                moment (two thumbs on a tablet), and the first notes can scroll in from the top
     easyLanes  🐣 EASY charts use exactly the 2 big lanes; 🔥 NORMAL uses all 4
     perfect    a perfect autopilot (pressing at the exact times, and again at 60 frames a second) gets every PERFECT
                and every hold, on every song at both levels
     allMiss    an autopilot that never presses never ends a song on EASY (NORMAL's dance meter may run out)
     fallback   the song clock follows the audio clock, keeps time from performance.now() while the audio is
                suspended, picks the audio up again without a jump, stands still while paused, never runs backwards
     calibration  taps 120 ms late (with wobble and stray taps) set a 120 ms timing offset
   run({ prove: true }) also breaks each one on purpose (a note 5 ms off the grid, two notes under one thumb, a third
   lane on EASY, a late autopilot, EASY that can fail, a clock without the fallback, an average instead of a median)
   and checks that every check then fails.
   In the page: game.check(). In node: node tools/check.js. */
(function () {
  'use strict';
  const DP = (window.DP = window.DP || {});
  const MS = 0.001;

  const levels = () => Object.keys(DP.charts.LEVELS);
  const each = (fn) => {
    const out = [];
    for (const song of DP.songs.list) for (const lv of levels()) out.push(...(fn(song, lv) || []));
    return out;
  };
  const chartOf = (song, lv, opt) => (opt.chart ? opt.chart(song, lv) : DP.charts.build(song, lv));

  // ---------------------------------------------------------------- grid
  function onsets(song) {
    const ts = song.events.filter((e) => e.kind !== 'pad').map((e) => e.t);
    return (t) => {
      let lo = 0, hi = ts.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (ts[mid] < t - MS) lo = mid + 1; else hi = mid; }
      return Math.abs(ts[lo] - t) <= MS;
    };
  }
  function grid(opt = {}) {
    return each((song, lv) => {
      const bad = [];
      const q = 30 / song.bpm; // an eighth note, worked out again from the tempo
      const sounds = onsets(song);
      for (const n of chartOf(song, lv, opt).notes) {
        for (const [what, t] of [['note', n.t]].concat(n.tail ? [['tail', n.tail]] : [])) {
          const off = Math.abs(t - Math.round(t / q) * q);
          if (off > MS) bad.push(`${what} ${n.id} is ${(off * 1000).toFixed(1)} ms off the grid`);
        }
        if (!sounds(n.t)) bad.push(`note ${n.id} at ${n.t.toFixed(3)} s has no sound under it`);
        if (n.t < song.notesFrom - MS) bad.push(`note ${n.id} is in the count-in bar`);
        if (n.t > song.finalHit + MS || (n.tail && n.tail > song.finalHit + MS)) bad.push(`note ${n.id} is after the final hit`);
      }
      return bad.slice(0, 3).map((b) => `${song.id}/${lv}: ${b}`);
    });
  }

  // ---------------------------------------------------------------- playable
  const handOf = (lv, lane) => (DP.charts.LEVELS[lv].lanes === 2 ? lane : lane < 2 ? 0 : 1);
  function playable(opt = {}) {
    return each((song, lv) => {
      const L = DP.charts.LEVELS[lv];
      const notes = chartOf(song, lv, opt).notes;
      const bad = [];
      const lastEnd = {};
      for (const n of notes) {
        if (lastEnd[n.lane] !== undefined && n.t - lastEnd[n.lane] < L.gap - MS) {
          bad.push(`lane ${n.lane} at ${n.t.toFixed(3)} s comes ${((n.t - lastEnd[n.lane]) * 1000).toFixed(0)} ms after the last`);
        }
        lastEnd[n.lane] = n.tail || n.t;
      }
      for (const a of notes) {
        for (const b of notes) {
          if (b.id <= a.id || handOf(lv, a.lane) !== handOf(lv, b.lane)) continue;
          if (Math.abs(a.t - b.t) < 0.2 - MS && !(a.lane === b.lane && b.t - (a.tail || a.t) >= L.gap - MS)) {
            bad.push(`notes ${a.id} and ${b.id} need one hand at once`);
          }
          if (a.tail && b.t > a.t + MS && b.t <= a.tail + 0.2 - MS) bad.push(`note ${b.id} comes while the same hand holds note ${a.id}`);
        }
      }
      if (L.lanes === 2) {
        const times = notes.map((n) => n.t.toFixed(4));
        if (new Set(times).size !== times.length) bad.push('two notes at once on EASY');
      }
      if (notes.length && notes[0].t - L.travel < -DP.charts.LEADIN) bad.push('the first note would appear mid-screen');
      if (notes.length < 20) bad.push(`only ${notes.length} notes`);
      return bad.slice(0, 3).map((b) => `${song.id}/${lv}: ${b}`);
    });
  }

  // ---------------------------------------------------------------- lanes
  function easyLanes(opt = {}) {
    return each((song, lv) => {
      const used = [...new Set(chartOf(song, lv, opt).notes.map((n) => n.lane))].sort();
      const want = lv === 'easy' ? '0,1' : '0,1,2,3';
      return used.join() === want ? [] : [`${song.id}/${lv}: uses lanes ${used.join(' ')}`];
    });
  }

  // ---------------------------------------------------------------- autopilots
  function levelFor(lv, opt) {
    return opt.level ? opt.level(DP.charts.LEVELS[lv]) : DP.charts.LEVELS[lv];
  }
  // Press every note at its time (+ late), let go at its tail; `fps` quantises the presses to frames.
  function autoplay(song, lv, opt, { late = 0, fps = 0, press = true } = {}) {
    const chart = chartOf(song, lv, opt);
    const p = DP.engine.create(Object.assign({}, chart, { level: levelFor(lv, opt) }));
    const E = DP.engine;
    if (fps) {
      const dt = 1 / fps;
      const pressed = new Set(), released = new Set();
      for (let t = -DP.charts.LEADIN; t < song.end + 1; t += dt) {
        E.update(p, t);
        if (!press) continue;
        for (const n of p.notes) {
          if (!pressed.has(n.id) && t >= n.t + late) { pressed.add(n.id); E.press(p, n.lane, t); }
          const off = n.tail || n.t + 0.05;
          if (pressed.has(n.id) && !released.has(n.id) && t >= off) { released.add(n.id); E.release(p, n.lane, t); }
        }
      }
    } else {
      const acts = [];
      if (press) {
        for (const n of p.notes) {
          acts.push({ t: n.t + late, lane: n.lane, down: true });
          acts.push({ t: (n.tail || n.t + 0.05) + late, lane: n.lane, down: false });
        }
      }
      acts.sort((a, b) => a.t - b.t || a.down - b.down);
      for (const a of acts) {
        E.update(p, a.t);
        if (a.down) E.press(p, a.lane, a.t);
        else E.release(p, a.lane, a.t);
      }
      for (let t = -DP.charts.LEADIN; t < song.end + 1; t += 1 / 30) E.update(p, t);
      E.update(p, song.end + 1);
    }
    return p;
  }

  function perfect(opt = {}) {
    const late = opt.late || 0;
    return each((song, lv) => {
      const bad = [];
      for (const fps of [0, 60]) {
        const p = autoplay(song, lv, opt, { late, fps });
        const holds = p.notes.filter((n) => n.tail).length;
        const how = fps ? `at ${fps} fps` : 'exact';
        if (p.counts.PERFECT !== p.notes.length) bad.push(`${how}: ${p.counts.PERFECT}/${p.notes.length} PERFECT`);
        if (p.counts.holds !== holds) bad.push(`${how}: ${p.counts.holds}/${holds} holds`);
        if (p.maxCombo !== p.notes.length || DP.engine.stars(p) !== 3 || !DP.engine.done(p) || p.failed) bad.push(`${how}: combo ${p.maxCombo}, ${DP.engine.stars(p)} stars`);
      }
      return bad.slice(0, 2).map((b) => `${song.id}/${lv}: ${b}`);
    });
  }

  function allMiss(opt = {}) {
    const out = [];
    for (const song of DP.songs.list) {
      const p = autoplay(song, 'easy', opt, { press: false, fps: 60 });
      if (p.failed) out.push(`${song.id}/easy: the song ended after ${p.counts.miss} misses`);
      else if (p.counts.miss !== p.notes.length || !DP.engine.done(p)) out.push(`${song.id}/easy: ${p.counts.miss}/${p.notes.length} missed, not done`);
    }
    return out;
  }
  // (for the report) how long a NORMAL dancer who never presses lasts
  function normalGiveUp() {
    return DP.songs.list.map((song) => {
      const p = autoplay(song, 'normal', {}, { press: false, fps: 60 });
      return `${song.id}: ${p.failed ? 'meter ran out after ' + p.counts.miss + ' misses' : 'lasted'}`;
    });
  }

  // ---------------------------------------------------------------- the clock
  function fallback(opt = {}) {
    const make = opt.clock || DP.clock.create;
    const bad = [];
    const env = { running: true, at: 100, pt: 50, ctx: true };
    const c = make({ audio: () => (env.ctx ? { running: env.running, t: env.at } : null), perf: () => env.pt });
    const tick = (sec, audioToo) => { // advance in 10 ms frames, like a page would
      for (let i = 0; i < Math.round(sec * 100); i++) {
        env.pt += 0.01;
        if (audioToo && env.running) env.at += 0.01;
        c.now();
      }
    };
    const expect = (what, want, tol = MS) => {
      const got = c.now();
      if (!(Math.abs(got - want) <= tol)) bad.push(`${what}: ${got.toFixed(4)} s, want ${want.toFixed(4)} s`);
    };
    c.start(-1.4);
    tick(1, true);
    expect('on the audio clock', -0.4);
    if (c.mode() !== 'audio') bad.push('not on the audio clock while the audio runs');
    const mapped = c.toAudio(0);
    env.running = false; // the browser suspends the audio: its clock stops
    tick(2, true);
    expect('audio suspended, performance.now() keeps time', 1.6);
    if (c.mode() !== 'perf') bad.push('no fallback while the audio is suspended');
    env.running = true; // the audio is back, its clock carries on from where it stopped
    const before = c.now();
    tick(0.01, true);
    if (c.now() < before || c.now() - before > 0.02) bad.push(`jumped ${((c.now() - before) * 1000).toFixed(0)} ms when the audio came back`);
    tick(1, true);
    expect('back on the audio clock', 2.61);
    // pause: the game suspends the audio too, so after the pause the music already scheduled is still in step
    c.pause();
    env.running = false;
    tick(3, true);
    expect('paused', 2.61);
    env.running = true;
    const anchor = c.toAudio(0);
    c.resume();
    tick(0.5, true);
    expect('after the pause', 3.11);
    if (Math.abs(c.toAudio(0) - anchor) > MS) bad.push('the pause moved the music against the notes');
    // the ? panel freezes performance.now() and suspends the audio: nothing moves
    env.running = false;
    for (let i = 0; i < 100; i++) c.now();
    expect('? panel open', 3.11);
    // no AudioContext at all (sound never started): performance.now() alone
    env.ctx = false;
    tick(1, false);
    expect('no audio at all', 4.11);
    // never backwards, whatever the sources do
    env.ctx = true; env.running = true; env.at -= 5;
    let last = c.now(), back = false;
    for (let i = 0; i < 300; i++) { env.pt += 0.004; env.at += (i % 7) * 0.003; const t = c.now(); if (t < last) back = true; last = t; }
    if (back) bad.push('ran backwards');
    if (!(mapped > 0)) bad.push('no audio mapping');
    return bad;
  }

  // a clock that only ever reads the audio clock: what the fallback check must catch
  function audioOnlyClock(src) {
    let anchor = null, t0 = 0, paused = true, last = 0;
    return {
      now() {
        if (paused) return last;
        const a = src.audio();
        if (!a) return last;
        if (anchor === null) anchor = a.t - t0;
        last = Math.max(last, a.t - anchor);
        return last;
      },
      start(t) { t0 = t; last = t; paused = false; anchor = null; this.now(); },
      pause() { paused = true; }, resume() { paused = false; }, seek() {},
      mode: () => 'audio', toAudio: (t) => (anchor || 0) + t, onAudio: () => true, isPaused: () => paused,
    };
  }

  // ---------------------------------------------------------------- the timing screen
  // Taps 120 ms late with a little wobble, one stray double-tap and one far-off tap: the offset must come out at 120 ms.
  function calibration(opt = {}) {
    const calc = opt.calibrate || DP.clock.calibrate;
    const s = DP.songs.calib;
    const beats = [];
    for (let t = s.barDur; t < s.finalHit + s.barDur - 1e-6; t += s.spb) beats.push(t);
    const bad = [];
    for (const late of [0.12, 0, 0.25]) {
      const taps = beats.map((b, i) => b + late + ((i * 7) % 5 - 2) * 0.008);
      taps.push(beats[5] + late + 0.16, beats[9] - 0.3);
      const r = calc(taps, beats);
      if (!r || Math.abs(r.offset - late) > 0.01) bad.push(`taps ${late * 1000} ms late gave ${r ? Math.round(r.offset * 1000) + ' ms' : 'nothing'}`);
    }
    if (calc([beats[0], beats[1]], beats)) bad.push('two taps were enough');
    return bad;
  }
  const meanCalibrate = (taps, beats) => {
    const errs = taps.map((t) => beats.reduce((m, b) => (Math.abs(t - b) < Math.abs(m) ? t - b : m), Infinity));
    return { offset: errs.reduce((a, b) => a + b, 0) / errs.length };
  };

  // ---------------------------------------------------------------- run them all
  const CHECKS = { grid, playable, easyLanes, perfect, allMiss, fallback, calibration };

  // ways to break each check on purpose
  const SABOTAGE = {
    grid: { chart: (s, lv) => { const c = DP.charts.build(s, lv); c.notes[3] = Object.assign({}, c.notes[3], { t: c.notes[3].t + 0.005 }); return c; } },
    playable: {
      chart: (s, lv) => {
        const c = DP.charts.build(s, lv);
        const n = c.notes[c.notes.length - 4];
        const other = lv === 'easy' ? 1 - n.lane : n.lane ^ 1; // the other lane under the same thumb
        c.notes.push(Object.assign({}, n, { id: c.notes.length, lane: other, tail: 0 }));
        c.notes.sort((a, b) => a.t - b.t);
        return c;
      },
    },
    easyLanes: { chart: (s, lv) => { const c = DP.charts.build(s, lv); if (lv === 'easy') c.notes[5] = Object.assign({}, c.notes[5], { lane: 3 }); return c; } },
    perfect: { late: 0.06 },
    allMiss: { level: (L) => Object.assign({}, L, { canFail: true }) },
    fallback: { clock: audioOnlyClock },
    calibration: { calibrate: meanCalibrate },
  };

  function run(opt = {}) {
    const t0 = Date.now();
    const results = Object.entries(CHECKS).map(([name, fn]) => {
      const problems = fn();
      return { name, ok: problems.length === 0, problems };
    });
    const out = { ok: results.every((r) => r.ok), results };
    if (opt.prove) {
      out.prove = Object.entries(SABOTAGE).map(([name, sab]) => {
        const problems = CHECKS[name](sab);
        return { name, caught: problems.length > 0, first: problems[0] || '(nothing found: this check cannot fail!)' };
      });
      out.proved = out.prove.every((p) => p.caught);
      out.ok = out.ok && out.proved;
    }
    out.stats = DP.songs.list.map((s) => {
      const e = DP.charts.build(s, 'easy').notes, n = DP.charts.build(s, 'normal').notes;
      return `${s.emoji} ${s.name} ${s.bpm} BPM ${s.end.toFixed(0)} s: ${e.length} easy, ${n.length} normal (${n.filter((x) => x.tail).length} holds)`;
    });
    out.normalGiveUp = normalGiveUp();
    out.ms = Date.now() - t0;
    return out;
  }

  DP.checks = { run, CHECKS, SABOTAGE, autoplay };
})();
