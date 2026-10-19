/* TT Dance Party: judging and scoring, one dancer at a time. Pure logic on song times (seconds), no page.
     press(p, lane, t)    a key or pad went down at song time t (already corrected by the timing offset)
     release(p, lane, t)  ... and came up (ends a hold note)
     update(p, t)         notes whose window has passed become misses; held notes finish
   Each note gets PERFECT, GREAT or OK by how close the press was, or a miss (a cute stumble, the combo starts again).
   On NORMAL a dance meter goes up with hits and down with misses; if it runs out the song ends for that dancer.
   On EASY nothing ever ends the song. While the buddy dances along, the timing windows are twice as wide. */
(function () {
  'use strict';
  const DP = (window.DP = window.DP || {});

  const POINTS = { PERFECT: 300, GREAT: 200, OK: 100 };
  const METER = { start: 0.6, PERFECT: 0.03, GREAT: 0.025, OK: 0.015, HOLD: 0.01, miss: -0.07, treat: 0.25 };
  const HOLD_BONUS = 100, HOLD_SLACK = 0.12; // let go up to this early and the hold still counts

  function create(chart, opts = {}) {
    const notes = chart.notes.map((n) => Object.assign({}, n, { judged: null, err: 0, holding: false, held: null }));
    const max = notes.length * POINTS.PERFECT + notes.filter((n) => n.tail).length * HOLD_BONUS;
    return {
      chart, level: chart.level, notes, max, onEvent: opts.onEvent || null,
      score: 0, points: 0, combo: 0, maxCombo: 0, meter: METER.start, failed: false,
      counts: { PERFECT: 0, GREAT: 0, OK: 0, miss: 0, holds: 0, dropped: 0 },
      next: 0, // first note not yet judged (in time order)
      down: [], // lanes held down right now
      boost: 0, // song time until which the buddy's wide windows last
    };
  }

  const windowsAt = (p, t) => {
    const w = p.level.windows;
    return t < p.boost ? { perfect: w.perfect * 2, great: w.great * 2, ok: w.ok * 2 } : w;
  };

  function emit(p, type, data) { if (p.onEvent) p.onEvent(type, data, p); }

  function gain(p, rating, t, note) {
    const mult = 1 + Math.min(p.combo, 40) / 40; // up to double at a 40 combo
    p.combo++;
    if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    p.points += POINTS[rating];
    p.score += Math.round(POINTS[rating] * mult);
    p.counts[rating]++;
    meter(p, METER[rating]);
    emit(p, 'hit', { rating, note, t, combo: p.combo });
  }

  function meter(p, d) {
    if (!p.level.canFail || p.failed) return;
    p.meter = Math.max(0, Math.min(1, p.meter + d));
    if (p.meter <= 0) { p.failed = true; emit(p, 'fail', {}); }
  }

  function press(p, lane, t) {
    if (p.failed) return null;
    if (!p.down.includes(lane)) p.down.push(lane);
    const w = windowsAt(p, t);
    let best = null;
    for (let i = p.next; i < p.notes.length; i++) {
      const n = p.notes[i];
      if (n.t - t > w.ok) break;
      if (n.judged || n.lane !== lane) continue;
      if (Math.abs(n.t - t) <= w.ok) { best = n; break; } // the earliest unjudged note in reach
    }
    if (!best) { emit(p, 'empty', { lane, t }); return null; }
    const err = t - best.t, a = Math.abs(err);
    const rating = a <= w.perfect ? 'PERFECT' : a <= w.great ? 'GREAT' : 'OK';
    best.judged = rating;
    best.err = err;
    if (best.tail) { best.holding = true; best.held = null; }
    gain(p, rating, t, best);
    advance(p);
    return rating;
  }

  function release(p, lane, t) {
    p.down = p.down.filter((l) => l !== lane);
    for (const n of p.notes) {
      if (!n.holding || n.lane !== lane) continue;
      finishHold(p, n, t >= n.tail - HOLD_SLACK, t);
    }
  }

  function finishHold(p, n, ok, t) {
    n.holding = false;
    n.held = ok;
    if (ok) {
      p.counts.holds++;
      p.points += HOLD_BONUS;
      p.score += HOLD_BONUS;
      meter(p, METER.HOLD);
      emit(p, 'hold', { note: n, t });
    } else {
      p.counts.dropped++;
      emit(p, 'drop', { note: n, t });
    }
  }

  function advance(p) {
    while (p.next < p.notes.length && p.notes[p.next].judged) p.next++;
  }

  function update(p, t) {
    if (p.failed) return;
    const w = windowsAt(p, t);
    for (let i = p.next; i < p.notes.length; i++) {
      const n = p.notes[i];
      if (n.t + w.ok >= t) break;
      if (n.judged) continue;
      n.judged = 'miss';
      p.counts.miss++;
      p.combo = 0;
      emit(p, 'miss', { note: n, t });
      meter(p, METER.miss);
      if (p.failed) return;
    }
    advance(p);
    for (const n of p.notes) if (n.holding && t >= n.tail) finishHold(p, n, true, t);
  }

  // how well it went, 0..1: points against a perfect run (the combo bonus doesn't count here)
  const percent = (p) => (p.max ? p.points / p.max : 0);
  function stars(p) {
    const pc = percent(p);
    let s = pc >= 0.9 ? 3 : pc >= 0.7 ? 2 : pc >= 0.4 ? 1 : 0;
    if (!p.level.canFail && !p.failed && s < 1) s = 1; // on EASY, dancing to the end is worth a star
    if (p.failed) s = 0;
    return s;
  }
  const done = (p) => p.failed || (p.next >= p.notes.length && !p.notes.some((n) => n.holding));

  // The buddy is dancing along until song time `until`.
  function boost(p, until) { p.boost = Math.max(p.boost, until); }
  function treat(p) { meter(p, METER.treat); }

  DP.engine = { create, press, release, update, percent, stars, done, boost, treat, POINTS, METER, HOLD_SLACK };
})();
