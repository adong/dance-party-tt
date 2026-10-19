/* TT Dance Party: the backyard disco. An evening garden with a picket fence, blocky trees and string lights, a stage
   with a light-up dance floor, swinging spotlights, a disco ball, speaker stacks, and a crowd of animal friends on the
   lawn who bounce on the beat and cheer when the combo grows.
     DP.stage.init(canvas)          renderer, scene, camera
     DP.stage.fit(free, box)        frame the dancers (box: world width and height above the floor) inside the free
                                    screen rectangle { x0, y0, x1, y1 } in px, around the menus, HUD and pads
     DP.stage.update(dt, beat)      lights and crowd; beat is the song's beat count (fractional), or null
     DP.stage.flash(x, color)       light the floor tiles under x
     DP.stage.excite(level) / cheer()   the crowd
     DP.stage.toScreen(v)           screen px of a world point */
(function () {
  'use strict';
  const T = THREE;
  const DP = (window.DP = window.DP || {});
  const { makeCanvas, toTexture, std, mesh, radialTexture, glowTexture, dotTexture, rand, pick } = Kit.gfx;

  const FLOOR_Y = 0.5;
  const COLORS = ['#ff3d7f', '#18d4ff', '#7ed957', '#ffd400', '#ff8a1f', '#9b6bff'];
  let renderer = null, W = 1, H = 1;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 400);
  const target = new T.Vector3(0, 1.8, 0);
  let lastFree = null, lastBox = null;

  const tiles = { mesh: null, n: 0, cols: 7, rows: 3, glow: [], col: [] };
  const bulbs = { mesh: null, n: 0 };
  const spots = [];
  const crowd = [];
  const speakers = [];
  let ball = null, sparkles = null, banner = null, excite = 0, cheerT = 0;
  const tmpC = new T.Color();

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene.fog = new T.Fog('#2a1f5c', 30, 90);
    scene.add(new T.HemisphereLight('#b9a8ff', '#3c6b34', 0.85));
    const key = new T.DirectionalLight('#fff1dd', 0.75);
    key.position.set(3, 8, 10);
    scene.add(key);
    const rim = new T.DirectionalLight('#ff8fd8', 0.35);
    rim.position.set(-6, 4, -6);
    scene.add(rim);
    sky();
    garden();
    stage();
    makeCrowd();
    resize();
  }

  // ---------------------------------------------------------------- the evening garden
  function sky() {
    const [c, g] = makeCanvas(16, 256);
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#120c3a');
    grad.addColorStop(0.45, '#3a2a8a');
    grad.addColorStop(0.62, '#a24fb0');
    grad.addColorStop(0.72, '#ff9a7a');
    grad.addColorStop(1, '#ffcf8a');
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 256);
    const dome = new T.Mesh(new T.SphereGeometry(150, 24, 16), new T.MeshBasicMaterial({ map: toTexture(c), side: T.BackSide, fog: false, depthWrite: false }));
    scene.add(dome);
    // stars
    const pts = [];
    for (let i = 0; i < 260; i++) {
      const a = rand(0, Math.PI * 2), e = rand(0.25, 1.4), r = 140;
      pts.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r - 20);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    scene.add(new T.Points(geo, new T.PointsMaterial({ map: dotTexture(), size: 1.4, transparent: true, depthWrite: false, fog: false, color: '#fff8d8' })));
    // the moon
    const moon = new T.Sprite(new T.SpriteMaterial({ map: radialTexture(128, [[0, '#fffbe8'], [0.42, '#fff3c4'], [0.47, 'rgba(255,243,196,0.35)'], [1, 'rgba(255,243,196,0)']]), fog: false, depthWrite: false }));
    moon.position.set(26, 34, -110);
    moon.scale.setScalar(22);
    scene.add(moon);
  }

  function lawnTexture() {
    const [c, g] = makeCanvas(256, 256);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#4f9a3c' : '#58a743';
      g.fillRect(0, i * 32, 256, 32);
    }
    g.fillStyle = 'rgba(30,70,20,0.25)';
    for (let i = 0; i < 400; i++) g.fillRect(Math.random() * 256, Math.random() * 256, 2, 5);
    const t = toTexture(c, true);
    t.repeat.set(10, 10);
    return t;
  }

  function garden() {
    mesh(new T.PlaneGeometry(220, 220).rotateX(-Math.PI / 2), std('#ffffff', { map: lawnTexture() }), 0, 0, 0, scene, false);
    // the picket fence along the back
    const pick1 = new T.BoxGeometry(0.32, 1.7, 0.1);
    const n = 70;
    const fence = new T.InstancedMesh(pick1, std('#f3ecdf'), n);
    const m = new T.Matrix4();
    for (let i = 0; i < n; i++) {
      m.makeTranslation(-24 + i * 0.7, 0.85, -9);
      fence.setMatrixAt(i, m);
    }
    scene.add(fence);
    mesh(new T.BoxGeometry(49, 0.16, 0.08), std('#e8dfcf'), 0.2, 1.2, -9.08, scene, false);
    mesh(new T.BoxGeometry(49, 0.16, 0.08), std('#e8dfcf'), 0.2, 0.45, -9.08, scene, false);
    // blocky trees behind it
    const leaf = [std('#2f7d3a'), std('#3b9147'), std('#27693a')], trunk = std('#7a5134');
    for (const [x, z, s] of [[-15, -13, 1.3], [-10.5, -15, 1.6], [-5.5, -14, 1.1], [6, -14.5, 1.4], [11, -13, 1.2], [16, -15, 1.7], [-20, -12, 1.2], [20.5, -12, 1.1]]) {
      const tree = new T.Group();
      tree.position.set(x, 0, z);
      tree.scale.setScalar(s);
      mesh(new T.BoxGeometry(0.6, 3, 0.6), trunk, 0, 1.5, 0, tree, false);
      mesh(new T.BoxGeometry(3, 2.2, 3), pick(leaf), 0, 3.6, 0, tree, false);
      mesh(new T.BoxGeometry(2.2, 1.6, 2.2), pick(leaf), 0.3, 5, 0.2, tree, false);
      scene.add(tree);
    }
    // string lights from poles across the garden
    const poleMat = std('#5b4636');
    const runs = [[[-11, 5.6, -4], [11, 5.6, -4]], [[-11, 5.6, -4], [-8, 4.6, 6]], [[11, 5.6, -4], [8, 4.6, 6]]];
    for (const p of [[-11, -4], [11, -4], [-8, 6], [8, 6]]) mesh(new T.BoxGeometry(0.18, p[1] > 0 ? 4.7 : 5.7, 0.18), poleMat, p[0], (p[1] > 0 ? 4.7 : 5.7) / 2, p[1], scene, false);
    const per = 16;
    bulbs.n = runs.length * per;
    bulbs.mesh = new T.InstancedMesh(new T.SphereGeometry(0.12, 8, 6), new T.MeshBasicMaterial({ color: '#ffffff' }), bulbs.n);
    const wire = [];
    let k = 0;
    for (const [a, b] of runs) {
      for (let i = 0; i < per; i++) {
        const u = (i + 0.5) / per;
        const p = new T.Vector3().lerpVectors(new T.Vector3(...a), new T.Vector3(...b), u);
        p.y -= Math.sin(u * Math.PI) * 0.9; // the wire sags
        m.makeTranslation(p.x, p.y - 0.12, p.z);
        bulbs.mesh.setMatrixAt(k, m);
        bulbs.mesh.setColorAt(k, tmpC.set(COLORS[k % COLORS.length]));
        k++;
      }
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const p = new T.Vector3().lerpVectors(new T.Vector3(...a), new T.Vector3(...b), u);
        p.y -= Math.sin(u * Math.PI) * 0.9;
        wire.push(p);
      }
    }
    scene.add(bulbs.mesh);
    for (let r = 0; r < runs.length; r++) {
      const line = new T.Line(new T.BufferGeometry().setFromPoints(wire.slice(r * 25, r * 25 + 25)), new T.LineBasicMaterial({ color: '#2b2238' }));
      scene.add(line);
    }
  }

  // ---------------------------------------------------------------- the stage
  function bannerTexture() {
    const [c, g] = makeCanvas(1024, 160);
    g.clearRect(0, 0, 1024, 160);
    const grad = g.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, '#ff3d7f');
    grad.addColorStop(0.5, '#9b6bff');
    grad.addColorStop(1, '#18d4ff');
    g.fillStyle = grad;
    Kit.gfx.roundRect(g, 8, 8, 1008, 144, 40);
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = '#14121f';
    g.stroke();
    g.font = `92px ${Kit.gfx.FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 14;
    g.strokeStyle = '#14121f';
    const title = (window.DP_TITLE || '').toUpperCase();
    g.strokeText(title, 512, 86);
    g.fillStyle = '#ffd400';
    g.fillText(title, 512, 86);
    return toTexture(c);
  }

  function ballTexture() {
    const [c, g] = makeCanvas(256, 128);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 32; x++) {
        const v = 140 + Math.floor(Math.random() * 110);
        g.fillStyle = Math.random() < 0.07 ? pick(COLORS) : `rgb(${v},${v},${v + 10})`;
        g.fillRect(x * 8, y * 8, 7, 7);
      }
    }
    return toTexture(c);
  }

  function coneTexture() {
    const [c, g] = makeCanvas(16, 128);
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 128);
    return toTexture(c);
  }

  function stage() {
    // the platform
    mesh(new T.BoxGeometry(10.4, FLOOR_Y, 5.6), std('#3b2a5e'), 0, FLOOR_Y / 2, -0.6, scene, false);
    mesh(new T.BoxGeometry(10.6, 0.12, 0.2), std('#ffd400', { emissive: '#7a5a00' }), 0, FLOOR_Y - 0.02, 2.22, scene, false);
    // steps at the front
    mesh(new T.BoxGeometry(2.4, 0.25, 0.6), std('#4b3a72'), 0, 0.125, 2.5, scene, false);
    // the light-up floor
    tiles.n = tiles.cols * tiles.rows;
    const tw = 9.8 / tiles.cols, td = 4.8 / tiles.rows;
    tiles.mesh = new T.InstancedMesh(new T.BoxGeometry(tw * 0.94, 0.04, td * 0.92), new T.MeshBasicMaterial({ color: '#ffffff' }), tiles.n);
    const m = new T.Matrix4();
    for (let r = 0; r < tiles.rows; r++) {
      for (let c = 0; c < tiles.cols; c++) {
        const i = r * tiles.cols + c;
        m.makeTranslation(-4.9 + tw * (c + 0.5), FLOOR_Y + 0.02, -3 + td * (r + 0.5));
        tiles.mesh.setMatrixAt(i, m);
        tiles.glow[i] = 0;
        tiles.col[i] = new T.Color(COLORS[(c + r) % COLORS.length]);
        tiles.mesh.setColorAt(i, tmpC.set('#2a2140'));
      }
    }
    scene.add(tiles.mesh);
    // the truss: two towers and a bar with the banner
    const truss = std('#c9c9d6', { metalness: 0.6, roughness: 0.35 });
    for (const x of [-5.2, 5.2]) mesh(new T.BoxGeometry(0.3, 6.2, 0.3), truss, x, 3.1, -3.2, scene, false);
    mesh(new T.BoxGeometry(10.7, 0.3, 0.3), truss, 0, 6.1, -3.2, scene, false);
    banner = mesh(new T.PlaneGeometry(6.4, 1), new T.MeshBasicMaterial({ map: bannerTexture(), transparent: true }), 0, 5.45, -3.15, scene, false);
    // a backdrop curtain of light strips
    for (let i = 0; i < 9; i++) {
      const strip = mesh(new T.PlaneGeometry(0.5, 4.2), new T.MeshBasicMaterial({ color: COLORS[i % COLORS.length], transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false }), -4 + i, 3.2, -3.3, scene, false);
      strip.userData.i = i;
      spots.push({ strip });
    }
    // spotlights hanging from the bar: cones of light, swinging with the beat
    const cone = coneTexture();
    for (let i = 0; i < 4; i++) {
      const pivot = new T.Group();
      pivot.position.set(-3.6 + i * 2.4, 5.9, -2.6);
      scene.add(pivot);
      mesh(new T.CylinderGeometry(0.22, 0.3, 0.45, 10), std('#222', { metalness: 0.5 }), 0, -0.1, 0, pivot, false);
      const beam = new T.Mesh(new T.CylinderGeometry(0.15, 1.5, 5.6, 20, 1, true).translate(0, -2.8, 0),
        new T.MeshBasicMaterial({ map: cone, color: COLORS[i * 2 % COLORS.length], transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      pivot.add(beam);
      spots.push({ pivot, beam, i });
    }
    // the disco ball
    ball = mesh(new T.SphereGeometry(0.55, 18, 12), new T.MeshBasicMaterial({ map: ballTexture() }), 0, 4.45, -0.6, scene, false);
    mesh(new T.CylinderGeometry(0.02, 0.02, 1.5, 4), std('#888'), 0, 5.3, -0.6, scene, false);
    mesh(new T.BoxGeometry(0.1, 0.1, 2.7), truss, 0, 6.05, -1.9, scene, false); // the arm it hangs from
    const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), color: '#bfe8ff', transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending }));
    glow.scale.setScalar(2.4);
    ball.add(glow);
    // sparkles thrown by the ball
    const n = 40, pos = [];
    for (let i = 0; i < n; i++) pos.push(rand(-6, 6), rand(0.6, 5), rand(-3.2, 1.5));
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    sparkles = new T.Points(geo, new T.PointsMaterial({ map: dotTexture(), size: 0.22, transparent: true, depthWrite: false, blending: T.AdditiveBlending, color: '#ffffff' }));
    sparkles.userData.base = pos.slice();
    scene.add(sparkles);
    // speaker stacks
    const box = std('#1c1a26'), coneM = std('#3a3848'), rimM = std('#9a98aa', { metalness: 0.5 });
    for (const x of [-6.1, 6.1]) {
      const g = new T.Group();
      g.position.set(x, 0, -2.4);
      scene.add(g);
      for (const [y, s] of [[0.7, 1.4], [1.95, 1.05]]) {
        mesh(new T.BoxGeometry(s, s, s * 0.8), box, 0, y, 0, g, false);
        const c = mesh(new T.CylinderGeometry(s * 0.32, s * 0.32, 0.05, 20).rotateX(Math.PI / 2), coneM, 0, y, s * 0.41, g, false);
        mesh(new T.TorusGeometry(s * 0.33, 0.04, 6, 20), rimM, 0, y, s * 0.42, g, false);
        speakers.push(c);
      }
    }
  }

  // ---------------------------------------------------------------- the crowd of animal friends
  const KINDS = {
    bunny: { body: '#f4f1ec', ear: 'long', inner: '#ffb3c7' },
    bear: { body: '#a8703f', ear: 'round', inner: '#7a4e2a', snout: '#e2b98b' },
    duck: { body: '#ffd84a', beak: '#ff8a1f' },
    cat: { body: '#ff9a3c', ear: 'point', inner: '#ffd2a8' },
    frog: { body: '#69c94e', ear: 'bump' },
    pig: { body: '#ffb3c7', ear: 'point', inner: '#ff8fab', snout: '#ff8fab' },
    penguin: { body: '#2b2d3a', belly: '#f4f4f4', beak: '#ffb02e' },
    panda: { body: '#f4f4f4', ear: 'round', inner: '#1b1a22', patch: '#1b1a22' },
  };

  function makeAnimal(kind) {
    const k = KINDS[kind];
    const root = new T.Group();
    const body = new T.Group();
    root.add(body);
    const mat = std(k.body), dark = std('#1b1a22'), white = std('#ffffff');
    mesh(new T.BoxGeometry(0.8, 0.8, 0.6), mat, 0, 0.6, 0, body, false);
    if (k.belly) mesh(new T.BoxGeometry(0.56, 0.6, 0.05), std(k.belly), 0, 0.58, 0.31, body, false);
    for (const s of [-1, 1]) mesh(new T.BoxGeometry(0.26, 0.2, 0.36), k.beak ? std(k.beak) : mat, s * 0.2, 0.1, 0.06, body, false);
    const head = new T.Group();
    head.position.y = 1.25;
    body.add(head);
    mesh(new T.BoxGeometry(0.74, 0.62, 0.62), mat, 0, 0, 0, head, false);
    for (const s of [-1, 1]) {
      if (k.patch) mesh(new T.BoxGeometry(0.2, 0.18, 0.04), std(k.patch), s * 0.16, 0.06, 0.31, head, false);
      mesh(new T.BoxGeometry(0.09, 0.11, 0.04), dark, s * 0.16, 0.06, 0.33, head, false);
      mesh(new T.BoxGeometry(0.035, 0.035, 0.02), white, s * 0.14, 0.09, 0.355, head, false);
      if (k.ear === 'long') {
        mesh(new T.BoxGeometry(0.16, 0.55, 0.1), mat, s * 0.18, 0.55, 0, head, false);
        mesh(new T.BoxGeometry(0.08, 0.4, 0.02), std(k.inner), s * 0.18, 0.55, 0.06, head, false);
      } else if (k.ear === 'round') {
        mesh(new T.BoxGeometry(0.22, 0.2, 0.1), std(k.inner || k.body), s * 0.28, 0.36, 0, head, false);
      } else if (k.ear === 'point') {
        const e = mesh(new T.BoxGeometry(0.2, 0.2, 0.08), std(k.inner || k.body), s * 0.25, 0.34, 0, head, false);
        e.rotation.z = Math.PI / 4;
      } else if (k.ear === 'bump') {
        mesh(new T.BoxGeometry(0.22, 0.16, 0.22), mat, s * 0.2, 0.36, 0.08, head, false);
        mesh(new T.BoxGeometry(0.1, 0.1, 0.04), dark, s * 0.2, 0.38, 0.2, head, false);
      }
    }
    if (k.beak) mesh(new T.BoxGeometry(0.3, 0.1, 0.18), std(k.beak), 0, -0.08, 0.38, head, false);
    if (k.snout) mesh(new T.BoxGeometry(0.26, 0.16, 0.08), std(k.snout), 0, -0.1, 0.34, head, false);
    if (!k.beak) mesh(new T.BoxGeometry(0.16, 0.05, 0.02), dark, 0, -0.17, 0.315, head, false); // a smile
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(s * 0.46, 0.92, 0);
      body.add(arm);
      mesh(new T.BoxGeometry(0.16, 0.48, 0.16), mat, 0, -0.22, 0, arm, false);
      arm.userData.side = s;
      arms.push(arm);
    }
    return { root, body, head, arms };
  }

  function makeCrowd() {
    const places = [
      ['bunny', -6.8, 0.7], ['bear', -8.2, -0.9], ['duck', -8.4, 0.9], ['cat', -9.9, -0.2],
      ['frog', 6.8, 0.7], ['pig', 8.2, -0.9], ['penguin', 8.4, 0.9], ['panda', 9.9, -0.2],
    ];
    places.forEach(([kind, x, z], i) => {
      const a = makeAnimal(kind);
      a.root.position.set(x, 0, z);
      a.root.rotation.y = Math.atan2(-x, 6 - z) * 0.7; // turned toward the stage and the camera
      a.root.scale.setScalar(rand(0.95, 1.15));
      a.phase = i * 0.37;
      scene.add(a.root);
      crowd.push(a);
    });
  }

  // ---------------------------------------------------------------- per frame
  let lastBeat = -1, clock = 0;
  function update(dt, beat) {
    clock += dt;
    const b = beat == null ? clock * 1.6 : beat;
    const bi = Math.floor(b), frac = b - bi, pulse = Math.pow(1 - frac, 2.2);
    if (bi !== lastBeat) {
      lastBeat = bi;
      floorPattern(bi);
    }
    // floor tiles fade between beats
    for (let i = 0; i < tiles.n; i++) {
      tiles.glow[i] *= Math.exp(-dt * 4);
      tmpC.set('#2a2140').lerp(tiles.col[i], Math.min(1, tiles.glow[i]));
      tiles.mesh.setColorAt(i, tmpC);
    }
    tiles.mesh.instanceColor.needsUpdate = true;
    // string lights twinkle
    for (let i = 0; i < bulbs.n; i++) {
      const on = mod(i + bi, 3) === 0 ? 1 : 0.55;
      tmpC.set(COLORS[i % COLORS.length]).multiplyScalar(on * (0.7 + pulse * 0.3));
      bulbs.mesh.setColorAt(i, tmpC);
    }
    bulbs.mesh.instanceColor.needsUpdate = true;
    // spotlights and the curtain
    for (const s of spots) {
      if (s.pivot) {
        s.pivot.rotation.z = Math.sin(b * Math.PI / 2 + s.i) * 0.45;
        s.pivot.rotation.x = 0.25 + Math.cos(b * Math.PI / 4 + s.i) * 0.2;
        s.beam.material.opacity = 0.12 + pulse * 0.14;
        s.beam.material.color.set(COLORS[mod(Math.floor(b / 4) + s.i * 2, COLORS.length)]);
      } else {
        s.strip.material.opacity = 0.08 + (mod(s.strip.userData.i + bi, 3) === 0 ? pulse * 0.3 : 0.02);
      }
    }
    ball.rotation.y += dt * 0.8;
    const pos = sparkles.geometry.attributes.position, base = sparkles.userData.base;
    for (let i = 0; i < pos.count; i++) {
      const a = clock * 0.6 + i;
      pos.setXYZ(i, base[i * 3] + Math.sin(a) * 1.2, base[i * 3 + 1] + Math.cos(a * 0.7) * 0.3, base[i * 3 + 2]);
    }
    pos.needsUpdate = true;
    sparkles.material.opacity = 0.4 + pulse * 0.6;
    for (const c of speakers) c.scale.setScalar(1 + pulse * 0.12);
    // the crowd
    if (cheerT > 0) cheerT -= dt;
    excite += ((cheerT > 0 ? 1 : exciteTarget) - excite) * Math.min(1, dt * 3);
    for (const a of crowd) {
      const ph = (b + a.phase) * Math.PI;
      const hop = Math.abs(Math.sin(ph)) * (0.05 + excite * 0.3);
      a.body.position.y = hop;
      a.head.rotation.z = Math.sin(ph) * 0.12;
      for (const arm of a.arms) {
        const up = 0.25 + excite * (2.1 + Math.sin(ph * 2 + arm.userData.side) * 0.5);
        arm.rotation.z = arm.userData.side * up;
      }
    }
  }

  const mod = (a, n) => ((a % n) + n) % n;
  const PATTERNS = [
    (r, c, b) => mod(r + c + b, 2) === 0,
    (r, c, b) => c === mod(b, 7) || c === 6 - mod(b, 7),
    (r, c, b) => r === mod(b, 3),
    (r, c, b) => Math.abs(c - 3) === mod(b, 4),
  ];
  function floorPattern(b) {
    const p = PATTERNS[mod(Math.floor(b / 8), PATTERNS.length)];
    for (let r = 0; r < tiles.rows; r++) for (let c = 0; c < tiles.cols; c++) {
      const i = r * tiles.cols + c;
      if (p(r, c, b)) tiles.glow[i] = Math.max(tiles.glow[i], 0.85);
    }
  }

  // light up the tiles under a dancer (world x) with a lane colour
  function flash(x, color) {
    const tw = 9.8 / tiles.cols;
    const c = Math.max(0, Math.min(tiles.cols - 1, Math.floor((x + 4.9) / tw)));
    for (let r = 0; r < tiles.rows; r++) {
      for (const cc of [c - 1, c, c + 1]) {
        if (cc < 0 || cc >= tiles.cols) continue;
        const i = r * tiles.cols + cc;
        tiles.col[i].set(color);
        tiles.glow[i] = cc === c ? 1.3 : 0.9;
      }
    }
  }

  let exciteTarget = 0.2;
  const setExcite = (v) => { exciteTarget = Math.max(0.1, Math.min(1, v)); };
  const cheer = (secs = 1.6) => { cheerT = Math.max(cheerT, secs); };

  // ---------------------------------------------------------------- camera
  function resize() {
    W = Math.max(1, innerWidth || 1);
    H = Math.max(1, innerHeight || 1);
    if (renderer) renderer.setSize(W, H, false);
    camera.aspect = W / H;
    if (lastFree) fit(lastFree, lastBox);
    else camera.updateProjectionMatrix();
  }

  // Frame a box `box.w` wide and `box.h` tall standing on the stage floor (centred on box.x) inside the screen
  // rectangle `free`, by moving the camera back along a fixed slant and shifting the picture (setViewOffset).
  const DIR = new T.Vector3(0, 0.3, 1).normalize();
  function fit(free, box) {
    lastFree = free;
    lastBox = box;
    const fw = Math.max(40, free.x1 - free.x0), fh = Math.max(40, free.y1 - free.y0);
    const vis = Math.max(box.h * H / fh, box.w * H / fw);
    const d = vis / (2 * Math.tan((camera.fov * Math.PI) / 360));
    target.set(box.x || 0, FLOOR_Y + box.h / 2, 0);
    camera.position.copy(target).addScaledVector(DIR, d);
    camera.lookAt(target);
    camera.setViewOffset(W, H, W / 2 - (free.x0 + free.x1) / 2, H / 2 - (free.y0 + free.y1) / 2, W, H);
    camera.updateProjectionMatrix();
  }

  const v3 = new T.Vector3();
  function toScreen(v) {
    v3.copy(v).project(camera);
    return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H };
  }

  function render() { renderer.render(scene, camera); }

  DP.stage = {
    init, resize, fit, update, render, flash, excite: setExcite, cheer, toScreen, makeAnimal,
    FLOOR_Y, COLORS, scene, camera,
    get W() { return W; }, get H() { return H; },
    redrawBanner() { banner.material.map = bannerTexture(); banner.material.needsUpdate = true; },
  };
})();
