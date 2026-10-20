/* TT Dance Party: the game. Screens: home (pick a song, who's dancing, how hard), the song (count-in, notes, the
   buddy), pause, results (stars, best score, the winner's signature move with confetti) and the timing screen
   (tap along to set how late the sound reaches you). window.game is a test hook, see the README. */
(function () {
  'use strict';
  const DP = window.DP, S = Kit.sound, A = DP.audio;
  const $ = (id) => document.getElementById(id);

  const COLORS = { easy: ['#ff3d7f', '#18d4ff'], normal: ['#ff3d7f', '#18d4ff', '#7ed957', '#ff8a1f'] };
  const DIRS = { easy: ['left', 'right'], normal: ['left', 'down', 'up', 'right'] };
  const LEVEL_LABEL = { easy: ['🐣', 'EASY'], normal: ['🔥', 'NORMAL'] };
  const KEYCAPS = { easy: [['←', '→'], ['A', 'D'], ['←', '→']], normal: [['←', '↓', '↑', '→'], ['A', 'S', 'W', 'D'], ['←', '↓', '↑', '→']] };

  // ---------------------------------------------------------------- saved: song, who, levels, timing, best scores
  const STORE = 'dancePartyTT.v1';
  const save = (() => {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { d = {}; }
    return Object.assign({ song: 'sunny', who: 'tommy', levels: { teddy: 'easy', tommy: 'easy' }, offset: 0, best: {} }, d);
  })();
  function persist() { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) { /* storage blocked */ } }

  // ---------------------------------------------------------------- state
  const src = { audio: () => (G.manual ? null : A.source()), perf: () => (G.manual ? G.vt : performance.now() / 1000) };
  const G = {
    state: 'loading', song: null, players: [], clock: null, music: A.player(),
    pclock: null, pmusic: A.player(), psong: null, cal: null,
    manual: false, vt: 0, held: false, auto: null, last: 0, dancers: {}, celebrate: null, ended: false,
    lastStumble: 0, countShown: null, ui: null, W: 0, H: 0,
  };
  G.pclock = DP.clock.create(src);
  const offset = () => save.offset || 0;
  const ids = () => (save.who === 'both' ? ['teddy', 'tommy'] : [save.who]);

  let ui, art = {};

  // ---------------------------------------------------------------- toasts and the big count
  function toast(text, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = text;
    ui.toasts.appendChild(el);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
    setTimeout(() => el.remove(), 1900);
  }
  function bigCount(text, go) {
    const el = ui.bigCount;
    el.textContent = text;
    el.className = go ? 'go' : '';
    void el.offsetWidth;
    el.classList.add('anim');
  }

  // ---------------------------------------------------------------- home
  function buildHome() {
    const words = window.DP_TITLE.split(' ');
    ui.logo.querySelector('small').textContent = words.slice(0, -1).join(' ');
    ui.logo.querySelector('big').textContent = words.slice(-1)[0];
    ui.songs.innerHTML = '';
    for (const s of DP.songs.list) {
      const b = document.createElement('button');
      b.className = 'card';
      b.dataset.id = s.id;
      b.style.setProperty('--tile', s.tile);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', s.name);
      const speed = s.bpm <= 100 ? '🐢' : s.bpm <= 120 ? '🐇' : '⚡';
      b.innerHTML = `<span class="speed" aria-hidden="true">${speed}</span><span class="emo">${s.emoji}</span><span class="nm"></span><span class="best"></span>`;
      b.querySelector('.nm').textContent = s.name;
      b.addEventListener('click', () => {
        if (save.song === s.id && G.state === 'home') return play();
        pickSong(s.id);
      });
      ui.songs.appendChild(b);
    }
    ui.who.querySelectorAll('button').forEach((b) => {
      const imgs = b.querySelectorAll('img');
      if (b.dataset.who === 'both') { imgs[0].src = art.faces.teddy; imgs[1].src = art.faces.tommy; } else imgs[0].src = art.faces[b.dataset.who];
      b.addEventListener('click', () => pickWho(b.dataset.who));
    });
    refreshHome();
  }

  function refreshHome() {
    ui.songs.querySelectorAll('.card').forEach((c) => {
      const on = c.dataset.id === save.song;
      c.classList.toggle('on', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
      const best = save.best[c.dataset.id] || {};
      const row = (lv) => (best[lv] && best[lv].stars ? LEVEL_LABEL[lv][0] + '⭐'.repeat(best[lv].stars) : '');
      c.querySelector('.best').innerHTML = [row('easy'), row('normal')].filter(Boolean).join('<br>');
    });
    ui.who.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', b.dataset.who === save.who);
      b.setAttribute('aria-checked', b.dataset.who === save.who ? 'true' : 'false');
    });
    ui.lvls.innerHTML = '';
    for (const id of ids()) {
      const box = document.createElement('div');
      box.className = 'lvl';
      box.innerHTML = `<img alt="" src="${art.faces[id]}">`;
      for (const lv of ['easy', 'normal']) {
        const b = document.createElement('button');
        b.className = save.levels[id] === lv ? 'on' : '';
        b.setAttribute('aria-label', LEVEL_LABEL[lv][1]);
        b.innerHTML = `<span>${LEVEL_LABEL[lv][0]}</span>`;
        const w = document.createElement('i');
        w.textContent = LEVEL_LABEL[lv][1];
        w.style.fontStyle = 'normal';
        b.appendChild(w);
        b.addEventListener('click', () => setLevel(id, lv));
        box.appendChild(b);
      }
      ui.lvls.appendChild(box);
    }
  }

  function pickSong(id, quiet) {
    save.song = id;
    persist();
    refreshHome();
    if (!quiet) A.sfx.click();
    startPreview();
  }
  function stepSong(d) {
    const list = DP.songs.list;
    const i = list.findIndex((s) => s.id === save.song);
    pickSong(list[(i + d + list.length) % list.length].id);
  }
  function pickWho(w) {
    save.who = w;
    persist();
    refreshHome();
    A.sfx.click();
    layout();
  }
  function setLevel(id, lv) {
    save.levels[id] = lv;
    persist();
    refreshHome();
    A.sfx.click();
  }

  // the chosen song's groove, quietly, looping its first verse
  function startPreview() {
    const s = DP.songs.get(save.song);
    G.psong = s;
    const from = s.sections[1].t;
    G.pclock.start(from - 0.05);
    G.pmusic.start(s, G.pclock, { vol: 0.55, loop: { from, to: from + s.barDur * 8 } });
  }
  function stopPreview() { G.pmusic.stop(); G.psong = null; }

  function goHome() {
    G.music.stop();
    stopSong();
    DP.highway.clear();
    G.celebrate = null;
    setState('home');
    refreshHome();
    for (const id of ['teddy', 'tommy']) {
      const d = G.dancers[id];
      resetDancer(d, id === 'teddy' ? -1.1 : 1.1);
      d.root.visible = true;
    }
    startPreview();
    layout();
  }

  // ---------------------------------------------------------------- screens
  function setState(s) {
    G.state = s;
    document.body.dataset.screen = s;
    ui.home.classList.toggle('hidden', s !== 'home');
    ui.hud.classList.toggle('hidden', !(s === 'play' || s === 'paused'));
    ui.pads.classList.toggle('hidden', !(s === 'play' || s === 'paused'));
    ui.buddyBtn.classList.toggle('hidden', !((s === 'play' || s === 'paused') && G.players.length === 1));
    ui.pause.classList.toggle('hidden', s !== 'paused');
    ui.results.classList.toggle('hidden', s !== 'results');
    ui.timing.classList.toggle('hidden', s !== 'timing');
    if (s !== 'play') {
      ui.songName.classList.add('hidden');
      ui.bigCount.className = '';
    }
  }

  function resetDancer(d, x) {
    Object.assign(d, { move: null, held: false, tired: false, count: 0, signature: null, x });
    d.ball.visible = false;
    d.root.position.set(x, DP.stage.FLOOR_Y, 0);
  }

  // ---------------------------------------------------------------- a song
  function play() {
    if (G.state !== 'home' && G.state !== 'results' && G.state !== 'paused') return;
    startSong(save.song);
  }

  function startSong(id) {
    stopPreview();
    G.music.stop();
    stopSong();
    const song = DP.songs.get(id);
    save.song = id;
    persist();
    G.song = song;
    G.ended = false;
    G.celebrate = null;
    G.countShown = null;
    DP.highway.clear();
    const who = ids();
    for (const k of ['teddy', 'tommy']) G.dancers[k].root.visible = who.includes(k);
    // the arrows are shuffled every time you dance (same rhythm, new arrows), differently for each brother
    const seed = G.nextSeed != null ? G.nextSeed : Math.floor(Math.random() * 2147483647);
    G.nextSeed = null;
    G.players = who.map((pid, pi) => {
      const level = save.levels[pid] || 'easy';
      const chart = DP.charts.build(song, level, null, (seed + pi * 7919) % 2147483647);
      const p = {
        pi, id: pid, level, L: DP.charts.LEVELS[level], chart, pressed: [], first: 0, lanes: [], hitY: 0, topY: 0, noteSize: 60,
        dancer: G.dancers[pid], autoUp: [], best: null,
      };
      p.eng = DP.engine.create(chart, { onEvent: (type, data) => onEvent(p, type, data) });
      resetDancer(p.dancer, who.length === 2 ? (pi ? 1.3 : -1.3) : 0);
      return p;
    });
    DP.buddy.setup(G.players.map((p) => p.dancer));
    buildPills();
    buildPads();
    ui.buddyFace.src = art.faces[Kit.roster.buddyFor(who[0])] || '';
    G.clock = DP.clock.create(src);
    G.clock.start(-DP.charts.LEADIN);
    G.music.start(song, G.clock);
    setState('play');
    ui.songName.querySelector('.e').textContent = song.emoji;
    ui.songName.querySelector('.n').textContent = song.name;
    ui.songName.classList.remove('hidden');
    layout();
  }

  function stopSong() {
    DP.buddy.clear();
    if (G.players) for (const p of G.players) p.pressed = [];
    G.players = [];
    ui.pads.innerHTML = '';
  }

  function judgeTime() { return G.clock.now() - offset(); }

  function press(p, lane) {
    if (G.state !== 'play' || !p || lane >= p.L.lanes) return;
    p.pressed[lane] = true;
    padLight(p, lane, true);
    DP.engine.press(p.eng, lane, judgeTime());
  }
  function release(p, lane) {
    if (!p || !p.pressed[lane]) return;
    p.pressed[lane] = false;
    padLight(p, lane, false);
    if (G.state === 'play') DP.engine.release(p.eng, lane, judgeTime());
    DP.dancer.release(p.dancer);
  }
  function releaseAll() {
    for (const p of G.players) for (let l = 0; l < p.L.lanes; l++) if (p.pressed[l]) release(p, l);
  }

  function onEvent(p, type, data) {
    const ln = data.note && p.lanes[data.note.lane];
    if (type === 'hit') {
      DP.dancer.hit(p.dancer, data.note.lane, p.L.lanes, G.song.spb, !!data.note.tail);
      DP.buddy.mirror(p.pi, data.note.lane, p.L.lanes, G.song.spb);
      if (ln) {
        DP.highway.pop(ln.x, p.hitY - p.noteSize * 0.95, data.rating, Math.max(18, Math.min(34, p.noteSize * 0.42)));
        if (data.rating !== 'OK') DP.highway.sparkle(ln.x, p.hitY, ln.color, data.rating === 'PERFECT' ? 12 : 7);
      }
      DP.stage.flash(p.dancer.x, ln ? ln.color : '#ffd400');
      A.sfx.hit(data.rating);
      if (data.combo % 25 === 0) {
        toast(`🔥 ${data.combo} COMBO!`, 'combo');
        A.sfx.combo(data.combo);
        DP.stage.cheer(1.2);
      }
    } else if (type === 'miss') {
      if (ln) DP.highway.pop(ln.x, p.hitY - p.noteSize * 0.95, 'miss', Math.max(18, Math.min(30, p.noteSize * 0.4)));
      if (!p.dancer.move || p.dancer.move.name !== 'stumble') DP.dancer.stumble(p.dancer);
      const now = performance.now();
      if (now - G.lastStumble > 300) { G.lastStumble = now; A.sfx.stumble(); }
    } else if (type === 'hold') {
      if (ln) DP.highway.pop(ln.x, p.hitY - p.noteSize * 1.5, 'HOLD', Math.max(16, Math.min(28, p.noteSize * 0.36)));
      A.sfx.hold();
      DP.dancer.release(p.dancer);
    } else if (type === 'drop') {
      DP.dancer.release(p.dancer);
    } else if (type === 'fail') {
      p.dancer.tired = true;
      p.dancer.move = null;
      releaseAll();
      toast(`💤 ${p.dancer.entry.name} IS TIRED!`, 'oops');
      buildPads();
      layout();
    }
  }

  function autopilot(p, tv) {
    if (!G.auto || G.auto === 'miss' || p.eng.failed) return;
    for (let l = 0; l < p.L.lanes; l++) if (p.pressed[l] && p.autoUp[l] != null && tv >= p.autoUp[l]) { p.autoUp[l] = null; release(p, l); }
    for (let i = p.eng.next; i < p.eng.notes.length; i++) {
      const n = p.eng.notes[i];
      if (n.t > tv) break;
      if (n.judged) continue;
      if (p.pressed[n.lane]) release(p, n.lane);
      press(p, n.lane);
      p.autoUp[n.lane] = n.tail ? n.tail + 0.02 : n.t + 0.06;
    }
  }

  function playUpdate() {
    const song = G.song;
    G.music.tick();
    const tv = G.clock.now() - offset();
    for (const p of G.players) {
      autopilot(p, tv);
      DP.engine.update(p.eng, tv);
      while (p.first < p.eng.notes.length && p.eng.notes[p.first].t < tv - 1.2 && !p.eng.notes[p.first].holding) p.first++;
    }
    // the count-in: the song's name, then 3 2 1 DANCE! on the four clicks of the first bar
    if (tv >= 0) ui.songName.classList.add('hidden');
    const b = Math.floor(tv / song.spb);
    if (tv >= 0 && b < 4 && b !== G.countShown) {
      G.countShown = b;
      bigCount(b < 3 ? String(3 - b) : 'DANCE!', b === 3);
    }
    const allOut = G.players.every((p) => p.eng.failed);
    if (!G.ended && (tv >= song.end || allOut)) {
      G.ended = true;
      G.endAt = tv;
      if (allOut) G.music.stop();
    }
    if (G.ended && tv - G.endAt >= (allOut ? 1.4 : 0)) showResults();
    const best = Math.max(...G.players.map((p) => p.eng.combo));
    DP.stage.excite(0.2 + best / 30);
    return tv;
  }

  // ---------------------------------------------------------------- pause
  function pause(on) {
    if (on && G.state === 'play') {
      releaseAll();
      G.clock.pause();
      S.suspend();
      setState('paused');
    } else if (!on && G.state === 'paused') {
      setState('play');
      S.resume();
      G.clock.resume();
    }
  }

  // ---------------------------------------------------------------- results
  function showResults() {
    releaseAll();
    DP.buddy.clear();
    setState('results');
    const song = G.song;
    const res = G.players.map((p) => {
      const e = p.eng;
      const r = { p, stars: DP.engine.stars(e), pc: DP.engine.percent(e), score: e.score, failed: e.failed, counts: e.counts, maxCombo: e.maxCombo };
      const book = (save.best[song.id] = save.best[song.id] || {});
      const old = book[p.level];
      r.newBest = !e.failed && e.score > 0 && (!old || e.score > old.score);
      if (r.newBest) book[p.level] = { score: e.score, stars: Math.max(r.stars, old ? old.stars : 0) };
      else if (old && r.stars > old.stars) old.stars = r.stars;
      return r;
    });
    persist();
    let winners = res;
    let head;
    if (res.length === 2) {
      const [a, b] = res;
      const cmp = a.stars - b.stars || (Math.abs(a.pc - b.pc) < 0.005 ? 0 : a.pc - b.pc);
      winners = cmp > 0 ? [a] : cmp < 0 ? [b] : res;
      head = winners.length === 2 ? '🤝 BOTH WIN!' : `🏆 ${winners[0].p.dancer.entry.name} WINS!`;
    } else {
      const r = res[0];
      head = r.failed ? '💤 TIRED OUT!' : r.stars >= 3 ? '🌟 SUPER STAR!' : r.stars === 2 ? '🎉 GREAT DANCING!' : r.stars === 1 ? '👏 NICE MOVES!' : '💪 GOOD TRY!';
      if (r.stars < 1) winners = [];
    }
    ui.rHead.textContent = head;
    ui.rCols.innerHTML = '';
    for (const r of res) {
      const col = document.createElement('div');
      col.className = 'rcol' + (res.length === 2 && winners.length === 1 && winners[0] === r ? ' win' : '');
      const lv = LEVEL_LABEL[r.p.level];
      col.innerHTML = `<div class="who2"><img alt="" src="${art.faces[r.p.id]}"><span data-no-lang>${r.p.dancer.entry.name}</span><span>${lv[0]}</span></div>` +
        `<div class="rstars">${'<span>⭐</span>'.repeat(3)}</div><div class="rscore">${r.score}</div>` +
        (r.newBest ? '<div class="rnew">NEW BEST!</div>' : '') +
        `<div class="rcounts"><span><i>PERFECT</i> <b>${r.counts.PERFECT}</b></span><span><i>GREAT</i> <b>${r.counts.GREAT}</b></span>` +
        `<span><i>OK</i> <b>${r.counts.OK}</b></span><span><i>OOPS</i> <b>${r.counts.miss}</b></span><span>🔥 <b>${r.maxCombo}</b></span></div>`;
      col.querySelectorAll('i').forEach((i) => (i.style.fontStyle = 'normal'));
      ui.rCols.appendChild(col);
      const stars = col.querySelectorAll('.rstars span');
      for (let i = 0; i < r.stars; i++) setTimeout(() => { stars[i].classList.add('got'); A.sfx.star(i); }, 450 + i * 380);
    }
    A.sfx.fanfare(Math.max(...res.map((r) => r.stars)));
    // the winner does his signature move, everyone else claps; confetti if anyone won
    G.celebrate = { winners: winners.map((r) => r.p.dancer), others: res.filter((r) => !winners.includes(r)).map((r) => r.p.dancer), t: 0, n: 0 };
    if (winners.length) {
      DP.highway.burst(res.length === 2 ? 180 : 140);
      A.sfx.cheer(true);
      DP.stage.cheer(3);
    }
    layout();
  }

  function celebrate(dt) {
    const c = G.celebrate;
    if (!c) return;
    c.t -= dt;
    if (c.t > 0) return;
    c.t = 2.1;
    for (const d of c.winners) {
      if (d.tired) continue;
      const sig = d.entry.signature || ['cheer'];
      const which = sig[c.n % sig.length];
      DP.dancer.signature(d, which, which === 'boxing' ? 1.7 : 1.4);
    }
    for (const d of c.others) if (!d.tired) DP.dancer.play(d, 'clap', 1, 0.6);
    if (c.n > 0 && c.winners.length && c.n % 2 === 0) DP.highway.burst(60);
    c.n++;
  }

  function nextSong() {
    const list = DP.songs.list;
    const i = list.findIndex((s) => s.id === G.song.id);
    startSong(list[(i + 1) % list.length].id);
  }

  // ---------------------------------------------------------------- the buddy
  function callBuddy(pi = 0) {
    if (G.state !== 'play' || !G.players[pi]) return null;
    return DP.buddy.call(pi);
  }

  // ---------------------------------------------------------------- the timing screen
  function openTiming() {
    if (G.state !== 'home') return;
    stopPreview();
    setState('timing');
    for (const k of ['teddy', 'tommy']) resetDancer(G.dancers[k], k === 'teddy' ? -1.1 : 1.1);
    startCal();
    layout();
  }
  function startCal() {
    const s = DP.songs.calib;
    const beats = [];
    for (let t = s.barDur; t < s.finalHit + s.barDur - 1e-6; t += s.spb) beats.push(t);
    G.cal = { song: s, clock: DP.clock.create(src), taps: [], beats, done: false, lastBeat: -1 };
    G.cal.clock.start(-0.5);
    G.music.start(s, G.cal.clock);
    ui.tDots.innerHTML = beats.map(() => '<i></i>').join('');
    ui.tText.textContent = 'Listen, and tap the drum on every boom!';
    calNote();
    showOffset();
  }
  function calNote(text) {
    ui.tNote.textContent = text || (S.isMuted() ? '🔇 The sound is off: turn it on to hear the drum.' : '');
  }
  function showOffset() {
    const ms = Math.round(offset() * 1000);
    ui.tVal.textContent = `${ms > 0 ? '+' : ''}${ms} ms`;
  }
  function calTap() {
    const c = G.cal;
    if (!c || c.done) return;
    const t = c.clock.now();
    c.taps.push(t);
    const dots = ui.tDots.children;
    const n = Math.min(dots.length, c.taps.length);
    for (let i = 0; i < n; i++) dots[i].classList.add('on');
    ui.tapPad.classList.add('hit');
    setTimeout(() => ui.tapPad.classList.remove('hit'), 90);
  }
  function calUpdate() {
    const c = G.cal;
    if (!c) return null;
    G.music.tick();
    const t = c.clock.now();
    const tv = t - offset();
    const bi = Math.floor(tv / c.song.spb);
    if (bi !== c.lastBeat && tv >= 0) {
      c.lastBeat = bi;
      const el = ui.tBeat;
      el.classList.remove('on');
      void el.offsetWidth;
      el.classList.add('on');
    }
    if (!c.done && t > c.beats[c.beats.length - 1] + 0.6) {
      c.done = true;
      const r = DP.clock.calibrate(c.taps, c.beats);
      if (r) {
        save.offset = Math.round(r.offset * 1000) / 1000;
        persist();
        showOffset();
        calNote('✔ Got it! Now the notes and the music match.');
      } else calNote('Tap along with every boom! Try again 🔁');
      ui.tText.textContent = 'Want to fine-tune? Use − and +.';
    }
    return tv / c.song.spb;
  }
  function nudge(d) {
    save.offset = Math.max(-0.1, Math.min(0.4, Math.round((offset() + d) * 1000) / 1000));
    persist();
    showOffset();
    A.sfx.click();
  }
  function closeTiming() {
    G.music.stop();
    G.cal = null;
    goHome();
  }

  // ---------------------------------------------------------------- layout: lanes, pads, camera
  const safe = { t: 0, b: 0, l: 0, r: 0 };
  function readSafe() {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    safe.t = parseFloat(cs.paddingTop) || 0;
    safe.r = parseFloat(cs.paddingRight) || 0;
    safe.b = parseFloat(cs.paddingBottom) || 0;
    safe.l = parseFloat(cs.paddingLeft) || 0;
    probe.remove();
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function layout() {
    const W = Math.max(1, innerWidth || 1), H = Math.max(1, innerHeight || 1);
    G.W = W;
    G.H = H;
    readSafe();
    DP.stage.resize();
    DP.highway.resize(W, H);
    const landscape = W / H > 1.1;
    if (G.state === 'play' || G.state === 'paused') {
      const n = G.players.length;
      const ph = clamp(H * 0.17, 58, 124);
      const padBottom = H - Math.max(10, safe.b + 6);
      const padTop = padBottom - ph;
      const ml = Math.max(10, safe.l + 4), mr = Math.max(10, safe.r + 4), gap = 6;
      const topY = safe.t + (W <= 560 ? 118 : 64); // narrow phones have the score pills on a second row
      let leftEnd = ml, rightStart = W - mr;
      G.players.forEach((p, pi) => {
        const k = p.L.lanes;
        let lw;
        if (n === 1) lw = k === 2 ? clamp(W * 0.2, 84, 200) : clamp(W * 0.115, 56, 124);
        else lw = k === 2 ? clamp(W * 0.11, 58, 150) : clamp(W * 0.075, 42, 104);
        const xs = [];
        if (n === 1 && k === 2) xs.push(ml + lw / 2, W - mr - lw / 2);
        else if (n === 1) xs.push(ml + lw / 2, ml + lw * 1.5 + gap, W - mr - lw * 1.5 - gap, W - mr - lw / 2);
        else if (pi === 0) for (let i = 0; i < k; i++) xs.push(ml + lw / 2 + i * (lw + gap));
        else for (let i = 0; i < k; i++) xs.push(W - mr - lw / 2 - (k - 1 - i) * (lw + gap));
        // (a window that's still 0 px wide, like a tab opened in the background, must not push a lane off screen)
        p.lanes = xs.map((x, i) => ({ i, x: clamp(x, lw / 2, Math.max(lw / 2, W - lw / 2)), w: lw, color: COLORS[p.level][i], dir: DIRS[p.level][i] }));
        p.noteSize = Math.min(lw * 0.86, ph * 0.95, 100);
        p.hitY = padTop - 10 - p.noteSize / 2;
        p.topY = topY;
        p.padTop = padTop;
        p.ph = ph;
        if (n === 1) {
          leftEnd = xs[k / 2 - 1] + lw / 2;
          rightStart = xs[k / 2] - lw / 2;
        } else if (pi === 0) leftEnd = xs[k - 1] + lw / 2;
        else rightStart = xs[0] - lw / 2;
      });
      placePads();
      // the buddy's big button, bottom middle (1 player)
      const cg = rightStart - leftEnd;
      const bs = clamp(Math.min(ph + 8, cg - 16), 64, 118);
      Object.assign(ui.buddyBtn.style, { width: bs + 'px', height: bs + 'px', left: (W / 2 - bs / 2) + 'px', top: (cg - 16 >= 64 ? padBottom - bs : padTop - bs - 12) + 'px' });
      let x0 = leftEnd + 6, x1 = rightStart - 6, box = { w: n === 2 ? 6.6 : 5.2, h: 4.2 };
      if (x1 - x0 < W * 0.42) { x0 = W * 0.04; x1 = W * 0.96; box = { w: n === 2 ? 5 : 4.6, h: 4.2 }; } // narrow: the lanes go over the stage
      DP.stage.fit({ x0, x1, y0: topY + 6, y1: padTop - 8 }, box);
    } else {
      // home, results, timing: the dancers beside (landscape) or below / above (portrait) the menu
      let free;
      if (G.state === 'results') free = landscape ? { x0: 0, x1: W * 0.38, y0: 50, y1: H - 16 } : { x0: 0, x1: W, y0: safe.t + 56, y1: H * 0.34 };
      else free = landscape ? { x0: 0, x1: W * 0.37, y0: 60, y1: H - 16 } : { x0: 0, x1: W, y0: H * 0.66 + 8, y1: H - Math.max(12, safe.b) };
      const two = G.state === 'home' || G.state === 'timing' || G.players.length === 2;
      DP.stage.fit(free, { w: two ? 5.2 : 4.4, h: 3.6 });
    }
  }

  function buildPills() {
    ui.pills.innerHTML = '';
    G.players.forEach((p, pi) => {
      const el = document.createElement('div');
      el.className = 'pl' + (pi === 1 ? ' right' : '');
      const lv = LEVEL_LABEL[p.level];
      el.innerHTML = `<img class="me" alt="" src="${art.faces[p.id]}"><span class="num"><b class="sc">0</b><span class="lv">${lv[0]} </span>` +
        (p.L.canFail ? '<i class="meter"><b></b></i>' : '') + '</span>';
      const lvw = document.createElement('span');
      lvw.textContent = lv[1];
      el.querySelector('.lv').appendChild(lvw);
      if (G.players.length === 2) {
        const b = document.createElement('button');
        b.className = 'call';
        b.setAttribute('aria-label', 'Call your brother');
        b.innerHTML = `<img alt="" src="${art.faces[Kit.roster.buddyFor(p.id)]}"><kbd>${pi ? 'Enter' : 'T'}</kbd>`;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); callBuddy(pi); });
        el.appendChild(b);
        p.callEl = b;
      }
      p.pill = el;
      p.scoreEl = el.querySelector('.sc');
      p.meterEl = el.querySelector('.meter b');
      ui.pills.appendChild(el);
    });
    if (G.players.length === 1) ui.pills.appendChild(document.createElement('span'));
  }

  const ARROW = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 7 L93 50 L68 50 L68 93 L32 93 L32 50 L7 50 Z" fill="#fff" stroke="#14121f" stroke-width="7" stroke-linejoin="round"/></svg>';
  const ROT = { left: -90, down: 180, up: 0, right: 90 };
  function buildPads() {
    ui.pads.innerHTML = '';
    for (const p of G.players) {
      p.padEls = [];
      for (let l = 0; l < p.L.lanes; l++) {
        const el = document.createElement('div');
        el.className = 'pad' + (p.eng.failed ? ' dim' : '');
        el.style.setProperty('--c', COLORS[p.level][l]);
        el.innerHTML = ARROW;
        el.querySelector('svg').style.transform = `rotate(${ROT[DIRS[p.level][l]]}deg)`;
        const caps = KEYCAPS[p.level][G.players.length === 2 ? p.pi + 1 : 0];
        const kb = document.createElement('kbd');
        kb.textContent = caps[l];
        el.appendChild(kb);
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', DIRS[p.level][l]);
        const down = (e) => {
          e.preventDefault();
          try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ }
          press(p, l);
        };
        const up = (e) => { e.preventDefault(); release(p, l); };
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('lostpointercapture', up);
        el.addEventListener('contextmenu', (e) => e.preventDefault());
        ui.pads.appendChild(el);
        p.padEls.push(el);
      }
    }
    placePads();
  }
  function placePads() {
    for (const p of G.players) {
      if (!p.padEls || !p.lanes.length) continue;
      p.padEls.forEach((el, l) => {
        const ln = p.lanes[l];
        Object.assign(el.style, { left: (ln.x - ln.w / 2) + 'px', width: ln.w + 'px', top: p.padTop + 'px', height: p.ph + 'px' });
      });
    }
  }
  function padLight(p, l, on) { if (p.padEls && p.padEls[l]) p.padEls[l].classList.toggle('down', on); }

  function updateHud(tv) {
    if (!(G.state === 'play' || G.state === 'paused')) return;
    ui.progressFill.style.transform = `scaleX(${clamp(tv / G.song.end, 0, 1)})`;
    for (const p of G.players) {
      if (p.scoreEl.textContent !== String(p.eng.score)) p.scoreEl.textContent = p.eng.score;
      if (p.meterEl) p.meterEl.style.transform = `scaleX(${p.eng.meter})`;
      p.pill.classList.toggle('out', p.eng.failed);
      if (p.callEl) p.callEl.classList.toggle('here', DP.buddy.helping(p.pi));
    }
    if (G.players.length === 1) ui.buddyBtn.classList.toggle('here', DP.buddy.helping(0));
  }

  // ---------------------------------------------------------------- input
  const LANE_KEYS = { ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up', ArrowRight: 'right', KeyA: 'left', KeyS: 'down', KeyW: 'up', KeyD: 'right' };
  // which player and lane a key is, or null
  function keyLane(code) {
    const dir = LANE_KEYS[code];
    if (!dir || !G.players.length) return null;
    const arrows = code.startsWith('Arrow');
    const p = G.players.length === 2 ? G.players[arrows ? 1 : 0] : G.players[0];
    const lane = DIRS[p.level].indexOf(dir);
    return lane < 0 ? null : { p, lane };
  }

  function bindInput() {
    // the sound starts on the first tap or key (the kit's rule); never wake it while paused
    const wake = () => { if (G.state !== 'paused') S.init(); };
    addEventListener('pointerdown', wake, { capture: true });
    addEventListener('keydown', wake, { capture: true });

    addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.code;
      if (k === 'KeyM') { if (!e.repeat) toggleMute(); return; }
      if (G.state === 'play') {
        const hit = keyLane(k);
        if (hit) { e.preventDefault(); if (!e.repeat) press(hit.p, hit.lane); return; }
        if (e.repeat) return;
        if (k === 'KeyT') callBuddy(0);
        else if (k === 'Enter' || k === 'NumpadEnter') callBuddy(G.players.length === 2 ? 1 : 0);
        else if (k === 'KeyP' || k === 'Escape') pause(true);
        return;
      }
      if (e.repeat) return;
      if (G.state === 'paused') {
        if (k === 'KeyP' || k === 'Escape' || k === 'Space' || k === 'Enter') { e.preventDefault(); pause(false); } else if (k === 'KeyR') play();
      } else if (G.state === 'home') {
        if (k === 'ArrowLeft' || k === 'KeyA') stepSong(-1);
        else if (k === 'ArrowRight' || k === 'KeyD') stepSong(1);
        else if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'KeyW' || k === 'KeyS') {
          const who = ids();
          const id = who.length === 2 ? (k.startsWith('Arrow') ? 'tommy' : 'teddy') : who[0];
          setLevel(id, k === 'ArrowUp' || k === 'KeyW' ? 'normal' : 'easy');
        } else if (k === 'Digit1') pickWho('teddy');
        else if (k === 'Digit2') pickWho('tommy');
        else if (k === 'Digit3') pickWho('both');
        else if (k === 'KeyC') openTiming();
        else if (k === 'Enter' || k === 'Space') { e.preventDefault(); play(); }
      } else if (G.state === 'results') {
        if (k === 'Enter' || k === 'Space') { e.preventDefault(); play(); } else if (k === 'KeyN') nextSong(); else if (k === 'Escape' || k === 'KeyH') goHome();
      } else if (G.state === 'timing') {
        if (k === 'Enter' || k === 'Escape') closeTiming();
        else if (k === 'KeyR') startCal();
        else if (k === 'Minus' || k === 'NumpadSubtract') nudge(-0.01);
        else if (k === 'Equal' || k === 'NumpadAdd') nudge(0.01);
        else if (k === 'Space' || LANE_KEYS[k]) { e.preventDefault(); calTap(); }
      }
    });
    addEventListener('keyup', (e) => {
      if (G.state !== 'play') return;
      const hit = keyLane(e.code);
      if (hit) release(hit.p, hit.lane);
    });
    addEventListener('blur', releaseAll);

    const tap = (el, fn) => el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
    tap(ui.playBtn, play);
    tap(ui.timingBtn, openTiming);
    tap(ui.pauseBtn, () => pause(true));
    tap(ui.muteBtn, toggleMute);
    tap(ui.pResume, () => pause(false));
    tap(ui.pRestart, () => play());
    tap(ui.pHome, goHome);
    tap(ui.rAgain, play);
    tap(ui.rNext, nextSong);
    tap(ui.rHome, goHome);
    tap(ui.tAgain, startCal);
    tap(ui.tDone, closeTiming);
    tap(ui.tMinus, () => nudge(-0.01));
    tap(ui.tPlus, () => nudge(0.01));
    ui.tapPad.addEventListener('pointerdown', (e) => { e.preventDefault(); calTap(); });
    ui.buddyBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); callBuddy(0); });
    S.onMute(() => { if (G.state === 'timing' && G.cal && !G.cal.done) calNote(); });

    addEventListener('resize', layout);
    document.addEventListener('visibilitychange', () => {
      if (G.manual) return;
      if (document.hidden) {
        if (G.state === 'play') pause(true);
        else if (G.state !== 'paused') S.suspend();
      } else if (G.state !== 'paused') S.resume();
    });
  }

  function toggleMute() {
    const muted = S.toggleMute();
    ui.muteBtn.textContent = muted ? '🔇' : '🔊';
  }

  // ---------------------------------------------------------------- the loop
  function step(dt) {
    dt = Math.min(dt, 0.1);
    if (G.manual) G.vt += dt;
    if ((innerWidth || 1) !== G.W || (innerHeight || 1) !== G.H) layout();
    let beat = null, view = null, tv = 0;
    const st = G.state;
    if (st === 'home') {
      G.pmusic.tick();
      if (G.psong) beat = (G.pclock.now() - offset()) / G.psong.spb;
    } else if (st === 'timing') {
      beat = calUpdate();
    } else if (st === 'play' || st === 'paused' || st === 'results') {
      if (st === 'play') tv = playUpdate();
      else { G.music.tick(); tv = G.clock.now() - offset(); }
      beat = tv / G.song.spb;
      if (st !== 'results') {
        view = {
          t: tv, beat,
          players: G.players.map((p) => ({
            lanes: p.lanes, notes: p.eng.notes, first: p.first, hitY: p.hitY, topY: p.topY, noteSize: p.noteSize, travel: p.L.travel,
            pressed: p.pressed, combo: p.eng.combo, boost: tv < p.eng.boost, failed: p.eng.failed, spb: G.song.spb,
          })),
        };
      }
    }
    if (st === 'results') celebrate(dt);
    const ddt = st === 'paused' ? 0 : dt;
    for (const id of ['teddy', 'tommy']) if (G.dancers[id].root.visible) DP.dancer.update(G.dancers[id], ddt, beat);
    if (st === 'play') DP.buddy.update(dt);
    for (const d of DP.buddy.dancers()) DP.dancer.update(d, ddt, beat);
    DP.stage.update(ddt, beat);
    DP.highway.update(ddt);
    DP.highway.draw(view);
    updateHud(tv);
    DP.stage.render();
  }

  function frame(now) {
    const dt = G.last ? (now - G.last) / 1000 : 0.016;
    G.last = now;
    if (!G.held) step(dt);
    requestAnimationFrame(frame);
  }
  // the music is scheduled from a timer too, so it keeps going when frames are slow
  setInterval(() => {
    if (G.state === 'home') G.pmusic.tick();
    else if (G.state === 'play' || G.state === 'timing' || G.state === 'results') G.music.tick();
  }, 25);

  // ---------------------------------------------------------------- boot
  function boot() {
    ui = {};
    for (const id of ['home', 'logo', 'songs', 'who', 'lvls', 'timingBtn', 'playBtn', 'hud', 'progressFill', 'pills', 'pauseBtn', 'muteBtn', 'pads',
      'buddyBtn', 'buddyFace', 'toasts', 'bigCount', 'songName', 'pause', 'pResume', 'pRestart', 'pHome', 'results', 'rHead', 'rCols', 'rAgain',
      'rNext', 'rHome', 'timing', 'tText', 'tapPad', 'tBeat', 'tDots', 'tMinus', 'tVal', 'tPlus', 'tNote', 'tAgain', 'tDone']) ui[id] = $(id);
    G.ui = ui;
    ui.muteBtn.textContent = S.isMuted() ? '🔇' : '🔊';
    Kit.lang.setup({ button: { top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: 'calc(max(10px, env(safe-area-inset-left, 0px)) + 48px)' } });
    const faces = Kit.portraits(Kit.roster.list.filter((c) => c.id === 'teddy' || c.id === 'tommy'), { size: 160 });
    art = { faces };
    DP.stage.init($('game'));
    DP.highway.init($('hw'));
    for (const id of ['teddy', 'tommy']) {
      G.dancers[id] = DP.dancer.create(id, {});
      DP.stage.scene.add(G.dancers[id].root);
    }
    DP.buddy.init({
      toast,
      sfx: { buddy: A.sfx.buddy, land: () => S.land() },
      boost: (pi, secs) => { const p = G.players[pi]; if (p) DP.engine.boost(p.eng, G.clock.now() - offset() + secs); },
      treat: (pi, emoji, label, who) => {
        const p = G.players[pi];
        if (!p) return;
        DP.engine.treat(p.eng);
        toast(`${emoji} ${label} FROM ${who}!`, 'treat');
        A.sfx.treat();
      },
    });
    buildHome();
    bindInput();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => DP.stage.redrawBanner());
    goHome();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- test hook
  window.game = {
    // advance `secs` of game time in 1/60 s steps on a stand-in clock, rendering as it goes (works with the pane hidden)
    step(secs = 0.1) {
      if (!G.manual) {
        G.manual = true;
        G.vt = performance.now() / 1000;
        for (const c of [G.clock, G.pclock, G.cal && G.cal.clock]) if (c) c.seek(c.now());
      }
      const n = Math.max(1, Math.round(secs * 60));
      for (let i = 0; i < n; i++) step(1 / 60);
      return game.info();
    },
    hold(on = true) { G.held = on; },
    // start(songId, { who: 'teddy' | 'tommy' | 'both', levels: { teddy, tommy }, seed }) - seed: the arrow shuffle
    start(id = save.song, o = {}) {
      if (o.who) save.who = o.who;
      if (o.seed != null) G.nextSeed = o.seed;
      if (o.levels) Object.assign(save.levels, o.levels);
      if (G.state === 'timing') closeTiming();
      startSong(id);
      return game.info();
    },
    home: () => (goHome(), game.info()),
    pause: (on = true) => (pause(on), game.info()),
    buddy: (pi = 0) => callBuddy(pi),
    press: (lane, pi = 0) => press(G.players[pi], lane),
    release: (lane, pi = 0) => release(G.players[pi], lane),
    // 'perfect' presses every note on its frame, 'miss' never presses, null hands it back
    autopilot(mode = 'perfect') { G.auto = mode; return mode; },
    timing: () => (openTiming(), game.info()),
    calTap,
    setOffset(s) { save.offset = s; persist(); },
    check: (o = { prove: true }) => DP.checks.run(o),
    info() {
      return {
        state: G.state, song: G.song && G.song.id, t: G.clock ? +(G.clock.now() - offset()).toFixed(3) : null,
        clock: G.clock ? G.clock.mode() : null, audio: A.ctx ? A.ctx.state : 'none', offset: offset(), manual: G.manual,
        players: G.players.map((p) => ({
          id: p.id, level: p.level, seed: p.chart.seed, score: p.eng.score, combo: p.eng.combo, maxCombo: p.eng.maxCombo, counts: Object.assign({}, p.eng.counts),
          meter: +p.eng.meter.toFixed(3), failed: p.eng.failed, stars: DP.engine.stars(p.eng), notes: p.eng.notes.length, boosted: G.clock && G.clock.now() - offset() < p.eng.boost,
        })),
        buddy: DP.buddy.info(),
      };
    },
    get G() { return G; },
    get save() { return save; },
  };

  let booted = false;
  const go = () => {
    if (booted) return;
    booted = true;
    boot();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
  setTimeout(go, 1500);
})();
