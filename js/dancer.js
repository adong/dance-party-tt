/* TT Dance Party: the dancers. Kit.people characters with a groove on the beat and a dance move for every hit, built
   from the kit's poses: Teddy's boxing jab and straight and his jump shot, Tommy's Y with peace fingers (比耶), plus
   hops, spins, a stiff robot, arm waves, side slides and claps. A miss is a wobbly stumble, never a fall.
   Conventions (from the kit): rotation.x swings a limb forward, armR.rotation.z > 0 swings his right arm out to his
   side, hips.rotation.x < 0 leans forward. The dancers face the camera, so his right is the screen's left. */
(function () {
  'use strict';
  const T = THREE;
  const DP = (window.DP = window.DP || {});
  const TAU = Math.PI * 2;

  const base = () => ({
    ll: 0, rl: 0, llz: 0, rlz: 0, la: 0, ra: 0, laz: 0, raz: 0, lean: -0.08, twist: 0,
    head: 0, headZ: 0, bob: 0, rigY: 0.55, yaw: 0, rigZ: 0, lift: 0, slide: 0, fingers: false,
  });
  const KEYS = Object.keys(base()).filter((k) => k !== 'fingers');

  // The kit's own poses (Kit.people.pose 'jab', 'straight', 'guard', 'jumpshot', 'peace'), read off a probe person
  // that's never shown, so the moves stay the kit's even if its numbers change.
  let probe = null;
  const cache = {};
  function kitPose(mode, ph = 0) {
    const key = mode + ph;
    if (cache[key]) return cache[key];
    if (!probe) probe = Kit.people.build(Kit.roster.get('tommy').look);
    Kit.people.pose(probe, ph, mode, 1);
    const P = probe;
    return (cache[key] = {
      ll: P.legL.rotation.x, rl: P.legR.rotation.x, la: P.armL.rotation.x, ra: P.armR.rotation.x,
      laz: P.armL.rotation.z, raz: P.armR.rotation.z, lean: P.hips.rotation.x, twist: P.hips.rotation.y,
      head: P.head.rotation.x, bob: P.hips.position.y - P.hipY,
    });
  }
  const JAB = () => kitPose('jab'), STRAIGHT = () => kitPose('straight'), GUARD = () => kitPose('guard', Math.PI / 2);

  // Each move sets target channels for progress u (0..1); side is -1 (screen left) or 1 (screen right).
  const MOVES = {
    jab(M, u, side) { Object.assign(M, side < 0 ? (u < 0.5 ? JAB() : STRAIGHT()) : (u < 0.5 ? STRAIGHT() : JAB())); },
    boxing(M, u) { const b = Math.floor(u * 6) % 4; Object.assign(M, b === 0 ? JAB() : b === 2 ? STRAIGHT() : GUARD()); },
    jumpshot(M, u) {
      Object.assign(M, kitPose('jumpshot'));
      if (u > 0.2) { M.la = 2.9; M.ra = 2.95; }
      M.lift = Math.sin(Math.min(1, u * 1.2) * Math.PI) * 0.75;
      M.ll = M.rl = 0.25 + Math.sin(u * Math.PI) * 0.35;
    },
    peace(M, u) {
      Object.assign(M, kitPose('peace'), { fingers: true });
      M.lift = Math.sin(u * Math.PI) * 0.22;
      M.ll = Math.sin(u * TAU) * 0.4;
      M.rl = -M.ll;
    },
    point(M, u, side) {
      const s = side < 0 ? 1 : -1; // the arm on that side of the screen
      Object.assign(M, { twist: -0.25 * side, rigZ: 0.12 * side, lean: -0.02 });
      if (s > 0) { M.ra = 0.5; M.raz = 2.5; M.la = -0.2; M.laz = -0.55; } else { M.la = 0.5; M.laz = -2.5; M.ra = -0.2; M.raz = 0.55; }
      M.llz = side > 0 ? -0.25 : 0;
      M.rlz = side < 0 ? 0.25 : 0;
    },
    robot(M, u, side) {
      const step = Math.floor(u * 3) % 2; // two stiff snaps
      const a = (step === 0) === (side < 0);
      Object.assign(M, a ? { la: 1.57, ra: 0, laz: 0, raz: 1.57 } : { la: 0, ra: 1.57, laz: -1.57, raz: 0 });
      M.twist = a ? 0.35 : -0.35;
      M.headZ = a ? 0.2 : -0.2;
      M.lean = 0;
      M.ll = M.rl = 0;
    },
    wave(M, u, side) {
      const w = Math.sin(u * TAU * 2);
      M.laz = -1.45 + w * 0.35;
      M.raz = 1.45 + Math.sin(u * TAU * 2 + 1.4) * 0.35;
      M.la = M.ra = 0.1;
      M.rigZ = Math.sin(u * Math.PI) * 0.12 * side;
      M.headZ = -w * 0.15;
      M.lean = 0;
    },
    hop(M, u) {
      if (u < 0.3) {
        const s = Math.sin((u / 0.3) * Math.PI / 2);
        Object.assign(M, { rigY: 0.55 - 0.18 * s, ll: 0.9 * s, rl: 0.9 * s, lean: -0.35 * s, la: -0.4 * s, ra: -0.4 * s });
      } else {
        const v = (u - 0.3) / 0.7;
        Object.assign(M, { ll: 0.5, rl: 0.5, la: 2.7, ra: 2.7, laz: -0.4, raz: 0.4, lean: 0, head: -0.2 });
        M.lift = Math.sin(v * Math.PI) * 0.55;
      }
    },
    slide(M, u, side) {
      const e = Math.sin(u * Math.PI);
      M.slide = side * 0.45 * e;
      M.llz = -0.35 * e;
      M.rlz = 0.35 * e;
      if (side < 0) { M.raz = 1.6; M.ra = 0.2; M.laz = -0.3; } else { M.laz = -1.6; M.la = 0.2; M.raz = 0.3; }
      M.headZ = -0.15 * side;
      M.rigZ = 0.08 * side;
    },
    clap(M, u) {
      const together = u > 0.35 && u < 0.6;
      Object.assign(M, { la: 1.45, ra: 1.45, laz: together ? -0.08 : 0.45, raz: together ? 0.08 : -0.45, lean: -0.05 });
      M.lift = Math.sin(u * Math.PI) * 0.12;
    },
    spin(M, u) {
      M.yaw = u * TAU;
      Object.assign(M, { laz: -1.3, raz: 1.3, la: 0.2, ra: 0.2, lean: 0 });
      M.lift = Math.sin(u * Math.PI) * 0.18;
    },
    stumble(M, u) {
      const w = Math.sin(u * Math.PI * 3);
      Object.assign(M, { lean: 0.22, la: 2.2 + Math.sin(u * 22) * 0.45, ra: 2.0 + Math.cos(u * 22) * 0.45, laz: -0.8, raz: 0.8, ll: 0.35, rl: -0.25, head: 0.25 });
      M.rigZ = w * 0.22;
      M.headZ = -w * 0.25;
      M.slide = w * 0.08;
    },
    cheer(M, u) {
      Object.assign(M, { la: 0.2, ra: 0.2, laz: -2.7, raz: 2.7, lean: 0, head: -0.25 });
      M.laz += Math.sin(u * TAU * 3) * 0.2;
      M.raz -= Math.sin(u * TAU * 3) * 0.2;
      M.lift = Math.abs(Math.sin(u * TAU * 1.5)) * 0.35;
    },
    tired(M) {
      Object.assign(M, { rigY: 0.16, ll: 1.45, rl: 1.45, lean: 0.12, la: 0.25, ra: 0.25, laz: -0.25, raz: 0.25, head: 0.35 });
    },
  };

  // What a hit makes him do. NORMAL: the arrow picks it. EASY: he runs through his whole list, left or right.
  const LISTS = {
    teddy: ['jab', 'jumpshot', 'robot', 'slide', 'hop', 'wave'],
    tommy: ['peace', 'wave', 'hop', 'slide', 'robot', 'clap'],
    other: ['point', 'wave', 'hop', 'slide', 'robot', 'clap'],
  };
  function moveFor(d, lane, lanes, count) {
    if (count > 0 && count % 10 === 0) return { name: 'spin', side: 1 };
    const who = d.id === 'teddy' || d.id === 'tommy' ? d.id : 'other';
    if (lanes === 2) {
      const list = LISTS[who];
      return { name: list[count % list.length], side: lane === 0 ? -1 : 1 };
    }
    switch (lane) {
      case 0: return { name: who === 'teddy' ? 'jab' : 'slide', side: -1 };
      case 1: return { name: count % 2 ? 'robot' : 'hop', side: count % 4 < 2 ? -1 : 1 };
      case 2: return { name: who === 'teddy' ? 'jumpshot' : who === 'tommy' ? 'peace' : 'point', side: 1 };
      default: return { name: who === 'teddy' ? 'jab' : 'wave', side: 1 };
    }
  }

  const ease = (u) => Math.min(1, u / 0.18) * Math.min(1, (1 - u) / 0.28);

  let ballTex = null;
  function create(id, opts = {}) {
    const entry = Kit.roster.get(id);
    const person = Kit.people.build(entry.look);
    person.root.rotation.y = Math.PI;
    const root = new T.Group();
    const body = new T.Group();
    root.add(body);
    body.add(person.root);
    const shadow = new T.Mesh(new T.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({ map: Kit.gfx.radialTexture(64, [[0, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
    shadow.position.y = 0.01;
    root.add(shadow);
    const ball = new T.Sprite(new T.SpriteMaterial({ map: ballTex || (ballTex = Kit.gfx.emojiTexture('🏀')), depthWrite: false }));
    ball.scale.setScalar(0.45);
    ball.visible = false;
    root.add(ball);
    const d = {
      id, entry, person, root, body, shadow, ball,
      x: opts.x || 0, scale: opts.scale || 1,
      move: null, held: false, count: 0, tired: false, signature: null,
      T: base(),
    };
    root.position.set(d.x, DP.stage.FLOOR_Y, 0);
    root.scale.setScalar(d.scale);
    return d;
  }

  // start a move (dur in seconds); `hold` keeps it at its peak until let go (hold notes)
  function play(d, name, side = 1, dur = 0.45) {
    d.move = { name, side, dur, u: 0, ball: name === 'jumpshot' && d.signature === 'jumpshot' };
    d.held = false;
  }
  function hit(d, lane, lanes, spb, holdNote) {
    d.count++;
    const m = moveFor(d, lane, lanes, d.count);
    const dur = m.name === 'spin' ? 0.62 : Math.max(0.32, Math.min(0.58, spb * 0.95));
    play(d, m.name, m.side, dur);
    if (holdNote) d.held = true;
  }
  function release(d) { d.held = false; }
  function stumble(d) { play(d, 'stumble', 1, 0.6); }

  // A celebration: Teddy's boxing combo or his jump shot (with the 🏀), Tommy's Y with peace fingers.
  function signature(d, which, secs = 1.6) {
    d.signature = which;
    play(d, which, 1, which === 'jumpshot' ? 0.9 : secs);
    if (which === 'jumpshot') d.ball.visible = true;
  }

  function update(d, dt, beat) {
    const M = base();
    // the groove: knees dip on every beat, arms swing over two
    const ph = (beat == null ? performance.now() / 500 : beat) * TAU;
    const dip = (1 + Math.cos(ph)) / 2;
    if (d.tired) MOVES.tired(M);
    else {
      M.rigY = 0.55 - dip * 0.05;
      M.ll = M.rl = dip * 0.18;
      M.lean = -0.08 - dip * 0.06;
      M.headZ = Math.sin(ph / 2) * 0.09;
      if (d.id === 'teddy') Object.assign(M, { la: 1.5 + dip * 0.25, ra: 1.5 + (1 - dip) * 0.25, laz: 0.32, raz: -0.32, twist: Math.sin(ph / 2) * 0.15 }); // fists up, like his boxing
      else {
        M.la = 0.25 + Math.sin(ph / 2) * 0.3;
        M.ra = 0.25 - Math.sin(ph / 2) * 0.3;
        M.laz = -0.18;
        M.raz = 0.18;
        M.rigZ = Math.sin(ph / 2) * 0.06;
      }
    }
    let w = 0;
    if (d.move) {
      const mv = d.move;
      if (!(d.held && mv.u >= 0.5)) mv.u += dt / mv.dur;
      const u = Math.min(1, mv.u);
      const target = base();
      MOVES[mv.name](target, u, mv.side, d);
      w = d.held && mv.u >= 0.5 ? 1 : ease(u);
      if (mv.name === 'spin' || mv.name === 'boxing' || mv.name === 'cheer' || mv.name === 'stumble') w = Math.max(w, u < 1 ? Math.min(1, u * 8, (1 - u) * 8) : 0);
      for (const k of KEYS) M[k] += (target[k] - M[k]) * w;
      if (target.fingers && w > 0.4) M.fingers = true;
      if (mv.ball) {
        if (u < 0.5) {
          d.ball.position.set(0, 2.45 + M.lift, 0.25);
        } else {
          const v = (u - 0.5) / 0.5;
          d.ball.position.set(0, 2.6 + M.lift + v * 2.2 - v * v * 0.6, 0.25 + v * 1.5);
        }
      }
      if (mv.u >= 1 && !d.held) {
        d.move = null;
        d.ball.visible = false;
      }
    }
    // ease the body toward the targets (fast enough to land on the beat)
    const k = 1 - Math.exp(-dt * (d.move ? 26 : 14));
    const p = d.person, C = d.T;
    for (const key of KEYS) C[key] += (M[key] - C[key]) * k;
    if (d.move && d.move.name === 'spin') C.yaw = M.yaw;
    else if (Math.abs(C.yaw) > 0.001 && !d.move) C.yaw = 0;
    p.legL.rotation.x = C.ll;
    p.legR.rotation.x = C.rl;
    p.legL.rotation.z = C.llz;
    p.legR.rotation.z = C.rlz;
    p.armL.rotation.x = C.la;
    p.armR.rotation.x = C.ra;
    p.armL.rotation.z = C.laz;
    p.armR.rotation.z = C.raz;
    p.hips.rotation.x = C.lean;
    p.hips.rotation.y = C.twist;
    p.head.rotation.x = C.head;
    p.head.rotation.z = C.headZ;
    p.hips.position.y = p.hipY + C.bob;
    p.rig.position.y = C.rigY;
    p.rig.rotation.y = C.yaw;
    p.rig.rotation.z = C.rigZ;
    if (p.fingers) for (const f of p.fingers) f.visible = M.fingers;
    d.body.position.set(C.slide, C.lift, 0);
    d.shadow.scale.setScalar(1 - Math.min(0.5, C.lift * 0.6));
    d.shadow.position.x = C.slide;
  }

  DP.dancer = { create, play, hit, release, stumble, signature, update, MOVES, moveFor };
})();
