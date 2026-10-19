/* TT Dance Party: the song clock. Song time is seconds from the song's first beat (negative during the lead-in).
   While the sound is running it follows the AudioContext clock, so the notes on screen and the music never drift
   apart; when the sound is suspended (no tap yet, the tab asleep, the ? panel open) it carries on from
   performance.now() instead, and picks the audio clock up again without a jump.
   Paused, it stands still in both. It never runs backwards.
   The time sources are passed in, so js/checks.js can drive it with fake clocks:
     audio() -> { running, t } or null,   perf() -> seconds. */
(function () {
  'use strict';
  const DP = (window.DP = window.DP || {});

  function create(src) {
    let paused = true, last = 0, mode = null, aAnchor = 0, haveAnchor = false, pAnchor = 0;
    let lastA = -1, lastAP = 0, lastP = 0; // smooth the audio clock between its updates (it ticks in buffers of a few ms)

    function now() {
      if (paused) return last;
      const a = src.audio(), p = src.perf();
      let t;
      if (a && a.running) {
        if (mode !== 'audio') {
          // back on the audio clock: keep the old anchor if it still agrees (a pause that suspended the audio too),
          // so the music already scheduled stays in step; otherwise pin the audio clock to where we are now
          if (!(haveAnchor && Math.abs(a.t - aAnchor - last) < 0.06)) aAnchor = a.t - last;
          haveAnchor = true;
          mode = 'audio';
          lastA = -1;
        }
        if (a.t !== lastA) { lastA = a.t; lastAP = p; }
        t = a.t - aAnchor + Math.min(0.03, Math.max(0, p - lastAP));
      } else {
        // the audio stopped under us: carry on from the last reading, on performance.now()
        if (mode !== 'perf') { pAnchor = (mode === 'audio' ? lastP : p) - last; mode = 'perf'; }
        t = p - pAnchor;
      }
      lastP = p;
      if (t > last) last = t;
      return last;
    }

    return {
      now,
      start(t0) { last = t0; paused = false; mode = null; haveAnchor = false; now(); },
      pause() { if (!paused) { now(); paused = true; mode = null; } },
      resume() { if (paused) { paused = false; mode = null; now(); } },
      seek(t) { last = t; mode = null; haveAnchor = false; },
      isPaused: () => paused,
      mode: () => (paused ? 'paused' : mode),
      // the AudioContext time at which song time t sounds (only meaningful while on the audio clock)
      toAudio: (t) => aAnchor + t,
      onAudio: () => !paused && mode === 'audio',
    };
  }

  // The timing screen: taps (song times) against the beats they were tapping along to. Each tap goes with its nearest
  // beat; taps more than 0.35 s from any beat are ignored. The offset is the median: how late the drum reaches the
  // ears (Bluetooth speakers are late) plus how late the hands like to tap. null if fewer than 6 taps count.
  function calibrate(taps, beats) {
    const errs = [];
    for (const t of taps) {
      let best = Infinity;
      for (const b of beats) if (Math.abs(t - b) < Math.abs(best)) best = t - b;
      if (Math.abs(best) <= 0.35) errs.push(best);
    }
    if (errs.length < 6) return null;
    errs.sort((a, b) => a - b);
    const mid = errs.length >> 1;
    const med = errs.length % 2 ? errs[mid] : (errs[mid - 1] + errs[mid]) / 2;
    return { offset: Math.max(-0.1, Math.min(0.4, med)), count: errs.length, spread: errs[errs.length - 1] - errs[0] };
  }

  DP.clock = { create, calibrate };
})();
