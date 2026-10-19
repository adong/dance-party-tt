/* TT Dance Party: calling your brother (Kit.roster.buddyFor: Tommy for Teddy, Teddy for Tommy). T, Enter or his face
   button, any time in a song, as often as you like.
   1 player: he jumps up on stage at his buddyScale, says hello with his signature move (Teddy: boxing combo, Tommy:
   the Y with ✌️), tosses you a treat (🍦 💧 🧃 🍪 🍉 🍌) and dances along for 8 seconds, copying your moves: while
   he's there the timing window is twice as wide and the next notes glow. Then a goodbye move (Teddy: jump shot 🏀)
   and he hops off. Calling again while he's there says hello again, brings another treat and starts the 8 s again.
   2 players: your brother is already dancing next to you, so he does his signature move from his spot and tosses
   the treat across; the help is the same. */
(function () {
  'use strict';
  const T = THREE;
  const DP = (window.DP = window.DP || {});
  const { pick, emojiTexture } = Kit.gfx;

  const VISIT = 8; // seconds of help
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];

  let api = null;
  const cache = {}; // the 1-player buddy dancers, made once each
  const visits = []; // one per player: { player, helper (dancer), own (a buddy dancer we made, 1P only), ... }
  const treats = [];
  const tmpA = new T.Vector3(), tmpB = new T.Vector3();

  function init(a) { api = a; }

  // A new song: who helps whom. `dancers` are the players' dancers, in player order.
  function setup(dancers) {
    clear();
    if (dancers.length === 1) {
      const me = dancers[0];
      const id = Kit.roster.buddyFor(me.id);
      const entry = Kit.roster.get(id);
      let own = cache[id];
      if (!own) {
        own = cache[id] = DP.dancer.create(id, { scale: entry.buddyScale || 0.8 });
        const tag = Kit.gfx.nameTag(entry.name, entry.tag || '#ffb02e');
        tag.position.y = 2.75;
        own.root.add(tag);
        DP.stage.scene.add(own.root);
      }
      Object.assign(own, { move: null, held: false, count: 0, signature: null });
      own.root.visible = false;
      visits.push({ pi: 0, me, helper: own, own, state: 'away', t: 0, until: 0, calls: 0, side: 1 });
    } else {
      dancers.forEach((me, pi) => visits.push({ pi, me, helper: dancers[1 - pi], own: null, state: 'away', t: 0, until: 0, calls: 0 }));
    }
  }

  function clear() {
    for (const v of visits) if (v.own) v.own.root.visible = false;
    visits.length = 0;
    for (const tr of treats) DP.stage.scene.remove(tr.sprite);
    treats.length = 0;
  }

  // player `pi` calls his brother
  function call(pi = 0) {
    const v = visits[pi];
    if (!v) return null;
    v.calls++;
    v.until = VISIT;
    v.t = 0;
    const name = v.helper.entry.name;
    api.boost(pi, VISIT);
    if (v.own) {
      if (v.state === 'away' || v.state === 'out') {
        v.state = 'in';
        v.side = v.me.x > 0.5 ? -1 : 1;
        v.from = v.side * 7;
        v.to = v.me.x + v.side * 1.9;
        v.own.root.visible = true;
        v.own.root.position.set(v.from, 0, 0.3);
        DP.dancer.play(v.own, 'hop', 1, 0.7);
        api.sfx.buddy();
      } else {
        v.state = 'hello';
        hello(v);
      }
    } else {
      v.state = 'hello';
      hello(v);
      api.sfx.buddy();
    }
    api.toast(`${name} SAYS: FOLLOW ME!`, 'buddy');
    return { state: v.state, helper: v.helper.id };
  }

  function hello(v) {
    v.t = 0;
    v.treatAt = 1.1;
    v.state = 'hello';
    DP.dancer.signature(v.helper, Kit.roster.signature(v.helper.entry, 'hello'), 1.2);
  }

  function toss(v) {
    const [emoji, label] = pick(TREATS);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture(emoji), depthTest: false, depthWrite: false }));
    sprite.scale.setScalar(0.7);
    sprite.renderOrder = 20;
    DP.stage.scene.add(sprite);
    v.helper.root.updateMatrixWorld(true);
    Kit.people.handWorld(v.helper.person, 1, tmpA);
    treats.push({ sprite, from: tmpA.clone(), v, emoji, label, u: 0 });
  }

  function update(dt) {
    for (const v of visits) {
      if (v.state === 'away') continue;
      v.t += dt;
      if (v.own) {
        const r = v.own.root;
        if (v.state === 'in') {
          const u = Math.min(1, v.t / 0.7);
          r.position.x = v.from + (v.to - v.from) * u;
          r.position.y = DP.stage.FLOOR_Y * u + Math.sin(u * Math.PI) * 2.2;
          if (u >= 1) { hello(v); api.sfx.land(); }
        } else if (v.state === 'out') {
          const u = Math.min(1, v.t / 0.6);
          r.position.x = v.to + (v.from - v.to) * u;
          r.position.y = DP.stage.FLOOR_Y * (1 - u) + Math.sin(u * Math.PI) * 2;
          if (u >= 1) { v.state = 'away'; r.visible = false; }
        } else {
          r.position.set(v.to, DP.stage.FLOOR_Y, 0.3);
        }
      }
      if (v.state === 'hello' && v.t >= v.treatAt) { v.state = 'dance'; toss(v); }
      if (v.state === 'hello' || v.state === 'dance') {
        v.until -= dt;
        if (v.until <= 0) {
          if (v.own) {
            v.state = 'bye';
            v.t = 0;
            DP.dancer.signature(v.own, Kit.roster.signature(v.own.entry, 'goodbye'), 0.9);
          } else v.state = 'away';
        }
      }
      if (v.state === 'bye' && v.t >= 1) { v.state = 'out'; v.t = 0; DP.dancer.play(v.own, 'hop', 1, 0.6); }
    }
    for (let i = treats.length - 1; i >= 0; i--) {
      const tr = treats[i];
      tr.u += dt / 0.65;
      const me = tr.v.me;
      me.root.updateMatrixWorld(true);
      Kit.people.handWorld(me.person, -1, tmpB);
      const u = Math.min(1, tr.u);
      tr.sprite.position.lerpVectors(tr.from, tmpB, u);
      tr.sprite.position.y += Math.sin(u * Math.PI) * 1.4;
      tr.sprite.material.rotation = u * 6;
      if (u >= 1) {
        DP.stage.scene.remove(tr.sprite);
        treats.splice(i, 1);
        api.treat(tr.v.pi, tr.emoji, tr.label, tr.v.helper.entry.name);
      }
    }
  }

  // the player hit a note: a visiting buddy copies the move
  function mirror(pi, lane, lanes, spb) {
    const v = visits[pi];
    if (!v || !v.own || v.state !== 'dance') return;
    DP.dancer.hit(v.own, lane, lanes, spb, false);
  }

  const helping = (pi) => { const v = visits[pi]; return !!v && (v.state === 'in' || v.state === 'hello' || v.state === 'dance'); };
  const dancers = () => visits.filter((v) => v.own && v.own.root.visible).map((v) => v.own);
  const info = () => visits.map((v) => ({ helper: v.helper.id, state: v.state, calls: v.calls, left: Math.max(0, v.until) }));

  DP.buddy = { init, setup, clear, call, update, mirror, helping, dancers, info, VISIT };
})();
