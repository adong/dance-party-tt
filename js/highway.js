/* TT Dance Party: the note lanes, drawn on a 2D canvas over the stage. Arrows fall from the top onto the targets just
   above the pads; hold notes trail a ribbon to their tail. Also the PERFECT / GREAT / OK pop-ups, the combo, the
   sparkles on a hit and the confetti at the end. Canvas words go through Kit.lang.t. */
(function () {
  'use strict';
  const DP = (window.DP = window.DP || {});
  const L = (s) => Kit.lang.t(s);
  const FONT = Kit.gfx.FONT;

  let cv = null, g = null, W = 1, H = 1, dpr = 1;
  const pops = [], parts = [], confetti = [];

  function init(canvas) {
    cv = canvas;
    g = cv.getContext('2d');
  }
  function resize(w, h) {
    W = w; H = h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }

  // An arrow pointing up in a unit box; turned for ← ↓ →.
  const ANG = { left: -Math.PI / 2, down: Math.PI, up: 0, right: Math.PI / 2 };
  function arrow(x, y, size, dir, fill, o = {}) {
    g.save();
    g.translate(x, y);
    g.rotate(ANG[dir]);
    g.scale(size, size);
    g.beginPath();
    g.moveTo(0, -0.47);
    g.lineTo(0.47, 0);
    g.lineTo(0.2, 0);
    g.lineTo(0.2, 0.45);
    g.lineTo(-0.2, 0.45);
    g.lineTo(-0.2, 0);
    g.lineTo(-0.47, 0);
    g.closePath();
    g.lineJoin = 'round';
    if (o.glow) {
      g.shadowColor = o.glow;
      g.shadowBlur = 26;
    }
    if (fill) {
      g.lineWidth = 0.2;
      g.strokeStyle = '#14121f';
      g.stroke();
      g.shadowBlur = 0;
      g.lineWidth = 0.08;
      g.strokeStyle = '#ffffff';
      g.stroke();
      g.fillStyle = fill;
      g.fill();
      // a shine on top
      g.globalAlpha *= 0.35;
      g.fillStyle = '#ffffff';
      g.fillRect(-0.12, -0.05, 0.08, 0.38);
    } else {
      g.lineWidth = o.line || 0.1;
      g.strokeStyle = o.stroke || 'rgba(255,255,255,0.9)';
      g.stroke();
      if (o.inner) { g.fillStyle = o.inner; g.fill(); }
    }
    g.restore();
  }

  function laneY(P, dt) { return P.hitY - (dt / P.travel) * (P.hitY - P.topY); }

  function drawPlayer(P, t, beat) {
    const lanes = P.lanes;
    const size = P.noteSize;
    const pulse = Math.pow(1 - (beat - Math.floor(beat)), 3);
    // the lane strips
    for (const ln of lanes) {
      const grad = g.createLinearGradient(0, P.topY, 0, P.hitY + size * 0.6);
      grad.addColorStop(0, 'rgba(20,18,31,0)');
      grad.addColorStop(0.25, P.failed ? 'rgba(20,18,31,0.25)' : 'rgba(20,18,31,0.38)');
      grad.addColorStop(1, 'rgba(20,18,31,0.55)');
      g.fillStyle = grad;
      g.fillRect(ln.x - ln.w / 2, P.topY, ln.w, P.hitY + size * 0.6 - P.topY);
      if (P.pressed[ln.i]) {
        const lit = g.createLinearGradient(0, P.hitY - size * 3, 0, P.hitY + size * 0.6);
        lit.addColorStop(0, 'rgba(255,255,255,0)');
        lit.addColorStop(1, ln.color + '88');
        g.fillStyle = lit;
        g.fillRect(ln.x - ln.w / 2, P.hitY - size * 3, ln.w, size * 3.6);
      }
    }
    // beat lines scrolling down with the notes
    if (!P.failed) {
      const x0 = Math.min(...lanes.map((l) => l.x - l.w / 2)), x1 = Math.max(...lanes.map((l) => l.x + l.w / 2));
      const spb = P.spb;
      for (let b = Math.ceil(t / spb); b * spb - t < P.travel; b++) {
        const y = laneY(P, b * spb - t);
        if (y < P.topY + 4) continue;
        g.fillStyle = b % 4 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)';
        g.fillRect(x0 + 4, y - (b % 4 === 0 ? 1.5 : 1), x1 - x0 - 8, b % 4 === 0 ? 3 : 2);
      }
    }
    // the targets
    for (const ln of lanes) {
      const s = size * (1 + pulse * 0.07) * (P.pressed[ln.i] ? 0.92 : 1);
      arrow(ln.x, P.hitY, s, ln.dir, null, { stroke: P.pressed[ln.i] ? '#ffffff' : 'rgba(255,255,255,0.85)', line: 0.11, inner: P.pressed[ln.i] ? ln.color + 'aa' : 'rgba(255,255,255,0.12)' });
    }
    if (P.failed) return;
    // hold ribbons first, then the arrows on top
    const notes = P.notes;
    for (let i = P.first; i < notes.length; i++) {
      const n = notes[i];
      if (n.t - t > P.travel + 0.2) break;
      if (!n.tail || n.held !== null) continue;
      if (n.judged === 'miss' && n.tail < t - 0.6) continue;
      const ln = lanes[n.lane];
      const yHead = n.holding ? P.hitY : laneY(P, n.t - t), yTail = laneY(P, n.tail - t);
      if (yHead < P.topY) continue;
      const w = ln.w * 0.34;
      const top = Math.max(P.topY, yTail);
      g.fillStyle = n.judged === 'miss' ? 'rgba(160,160,170,0.45)' : n.holding ? ln.color : ln.color + 'aa';
      g.strokeStyle = '#14121f';
      g.lineWidth = 3;
      g.beginPath();
      Kit.gfx.roundRect(g, ln.x - w / 2, top, w, Math.max(0, yHead - top), w / 2);
      g.fill();
      g.stroke();
      if (n.holding) {
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.fillRect(ln.x - w * 0.12, top + 6, w * 0.24, Math.max(0, yHead - top - 12));
      }
    }
    for (let i = P.first; i < notes.length; i++) {
      const n = notes[i];
      const dt = n.t - t;
      if (dt > P.travel + 0.2) break;
      if (n.judged && n.judged !== 'miss') continue;
      const ln = lanes[n.lane];
      let y = laneY(P, dt);
      if (y < P.topY - size) continue;
      let alpha = 1;
      if (n.judged === 'miss') {
        alpha = Math.max(0, 1 - (t - n.t) * 2.5);
        if (alpha <= 0) continue;
      }
      // fade in at the top
      alpha *= Math.min(1, (y - P.topY + size) / (size * 1.5));
      g.globalAlpha = alpha;
      const glow = P.boost && !n.judged ? '#ffe680' : null;
      if (glow) {
        g.fillStyle = 'rgba(255,230,128,0.35)';
        g.beginPath();
        g.arc(ln.x, y, size * (0.62 + Math.sin(t * 10 + i) * 0.05), 0, Math.PI * 2);
        g.fill();
      }
      arrow(ln.x, y, size, ln.dir, n.judged === 'miss' ? '#9a98aa' : ln.color, { glow });
      g.globalAlpha = 1;
    }
    // the combo, big and soft above the lanes
    if (P.combo >= 3) {
      const cx = (Math.min(...lanes.map((l) => l.x)) + Math.max(...lanes.map((l) => l.x))) / 2;
      const fs = Math.max(24, Math.min(56, P.noteSize * 0.7));
      const cy = P.topY + fs * 0.55;
      g.save();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.globalAlpha = 0.85;
      g.font = `${fs}px ${FONT}`;
      g.lineWidth = fs * 0.14;
      g.strokeStyle = '#14121f';
      g.strokeText(String(P.combo), cx, cy);
      g.fillStyle = P.combo >= 50 ? '#ff8a1f' : P.combo >= 20 ? '#ffd400' : '#ffffff';
      g.fillText(String(P.combo), cx, cy);
      g.font = `${fs * 0.36}px ${FONT}`;
      g.lineWidth = fs * 0.08;
      const word = L('COMBO');
      g.strokeText(word, cx, cy + fs * 0.62);
      g.fillStyle = '#ffffff';
      g.fillText(word, cx, cy + fs * 0.62);
      g.restore();
    }
  }

  // ---------------------------------------------------------------- pop-ups, sparkles, confetti
  const RATING = {
    PERFECT: ['PERFECT!', '#ffd400'],
    GREAT: ['GREAT!', '#3fe0b0'],
    OK: ['OK', '#ffffff'],
    miss: ['OOPS!', '#ff8fb5'],
    HOLD: ['HOLD!', '#ffb02e'],
  };
  function pop(x, y, kind, size) {
    const [text, color] = RATING[kind] || [kind, '#ffffff'];
    for (let i = pops.length - 1; i >= 0; i--) if (Math.abs(pops[i].x - x) < 4 && pops[i].age < 0.25) pops.splice(i, 1);
    pops.push({ text, color, x, y, age: 0, size: size || 28 });
  }
  function sparkle(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.5 + Math.random() * 0.3, age: 0, color, r: 3 + Math.random() * 4 });
    }
  }
  const CONF = ['#ff3d7f', '#18d4ff', '#7ed957', '#ffd400', '#ff8a1f', '#9b6bff', '#ffffff'];
  function burst(n = 140) {
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0;
      confetti.push({
        x: fromLeft ? -10 : W + 10, y: H * (0.55 + Math.random() * 0.3),
        vx: (fromLeft ? 1 : -1) * (250 + Math.random() * 420), vy: -(420 + Math.random() * 520),
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, w: 8 + Math.random() * 8, h: 5 + Math.random() * 5,
        color: CONF[i % CONF.length], age: 0, life: 3 + Math.random() * 1.5,
      });
    }
  }

  function update(dt) {
    for (const p of pops) p.age += dt;
    for (let i = pops.length - 1; i >= 0; i--) if (pops[i].age > 0.7) pops.splice(i, 1);
    for (const p of parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].age > parts[i].life) parts.splice(i, 1);
    for (const c of confetti) {
      c.age += dt;
      c.vx *= Math.exp(-dt * 0.9);
      c.vy += 520 * dt;
      c.vy *= Math.exp(-dt * 1.2);
      c.x += c.vx * dt + Math.sin(c.age * 5 + c.rot) * 30 * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
    }
    for (let i = confetti.length - 1; i >= 0; i--) if (confetti[i].age > confetti[i].life || confetti[i].y > H + 40) confetti.splice(i, 1);
  }

  function draw(view) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (view && view.players) for (const P of view.players) drawPlayer(P, view.t, view.beat);
    for (const p of parts) {
      g.globalAlpha = Math.max(0, 1 - p.age / p.life);
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const p of pops) {
      const k = p.age / 0.7;
      const s = p.size * (k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15)));
      g.globalAlpha = k > 0.6 ? Math.max(0, 1 - (k - 0.6) / 0.4) : 1;
      g.font = `${s}px ${FONT}`;
      g.lineWidth = s * 0.18;
      g.strokeStyle = '#14121f';
      const y = p.y - k * 30;
      const text = L(p.text);
      const half = g.measureText(text).width / 2 + 6;
      const x = Math.max(half, Math.min(W - half, p.x));
      g.strokeText(text, x, y);
      g.fillStyle = p.color;
      g.fillText(text, x, y);
    }
    g.globalAlpha = 1;
    for (const c of confetti) {
      g.save();
      g.translate(c.x, c.y);
      g.rotate(c.rot);
      g.globalAlpha = Math.min(1, (c.life - c.age) / 0.6);
      g.fillStyle = c.color;
      g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.age * 6 + c.rot)));
      g.restore();
    }
    g.globalAlpha = 1;
  }

  DP.highway = { init, resize, draw, update, pop, sparkle, burst, arrow, clear: () => { pops.length = parts.length = confetti.length = 0; } };
})();
