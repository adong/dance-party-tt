/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button (top left).
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.DP_TITLE,
  cols: ['Teddy (left)', 'Tommy (right)'],
  keys: [
    ['dance: 🔥 NORMAL', 'A S W D', '← ↓ ↑ →'],
    ['dance: 🐣 EASY', 'A D', '← →'],
    ['hold a long note', 'hold the key', 'hold the key'],
    ['call your brother', 'T', 'Enter'],
    ['pick a song', 'A D', '← →'],
    ['level 🐣 / 🔥', 'W S', '↑ ↓'],
    ['who dances', '1 2 3', '1 2 3'],
    ['dance! · again', 'Enter or Space', 'Enter or Space'],
    ['timing (tap along)', 'C', 'C'],
    ['pause', 'P or Esc', 'P or Esc'],
    ['sound on / off', 'M', 'M'],
  ],
  note: 'Hit the key as an arrow lands on its target. With 1 dancer, both sets of keys work and T or Enter calls your brother.',
  touch: "Tap the big pads at the bottom as the arrows land on them. Tap your brother's face to call him.",
  button: { top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: 'max(10px, env(safe-area-inset-left, 0px))' },
});
