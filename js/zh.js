/* 中文 for TT Dance Party: the words on the page, the toasts, the canvas pop-ups (PERFECT!, COMBO, drawn through
   Kit.lang.t in js/highway.js) and the ? panel (Kit.lang, from kit/lang.js). Simple words: Tommy is 5.
   The kids' names, the songs' names and the game's own name stay in English on purpose. */
(function () {
  const L = Kit.lang;
  const title = window.DP_TITLE;
  const words = title.split(' ');
  L.keep(['TEDDY', 'TOMMY', 'Teddy', 'Tommy', title, words.slice(0, -1).join(' '), words.slice(-1)[0], 'Esc', 'ms'].concat(DP.songs.list.map((s) => s.name)));

  L.add({
    // home
    'Pick a song': '选一首歌', "Who's dancing?": '谁来跳舞？', 'BOTH': '一起跳',
    'Teddy dances': 'Teddy 跳', 'Tommy dances': 'Tommy 跳', 'Teddy and Tommy dance': 'Teddy 和 Tommy 一起跳',
    'Dance!': '跳舞！', 'Dance! (Enter)': '跳舞！(回车)', 'Timing': '节拍校准', 'Timing (C)': '节拍校准 (C)',
    // dancing
    'Pause': '暂停', 'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开 / 关',
    'Call your brother': '叫兄弟来帮忙', 'READY?': '准备好了吗？', 'DANCE!': '跳吧！',
    'PERFECT!': '完美！', 'GREAT!': '真棒！', 'OK': '还行', 'OOPS!': '哎呀！', 'HOLD!': '按住啦！', 'COMBO': '连击',
    'left': '左', 'right': '右', 'up': '上', 'down': '下',
    // pause, results
    'Keep dancing': '继续跳', 'Start the song again': '从头再跳', 'Songs': '选歌',
    'Dance again': '再跳一次', 'Next song': '下一首', 'NEW BEST!': '新纪录！', 'PERFECT': '完美', 'GREAT': '真棒', 'OOPS': '哎呀',
    '🤝 BOTH WIN!': '🤝 两个人都赢啦！', '💤 TIRED OUT!': '💤 跳累啦！', '🌟 SUPER STAR!': '🌟 超级舞星！',
    '🎉 GREAT DANCING!': '🎉 跳得真好！', '👏 NICE MOVES!': '👏 跳得不错！', '💪 GOOD TRY!': '💪 加油！',
    // timing
    '🎧 TIMING': '🎧 节拍校准', 'Tap along': '跟着拍', 'Earlier': '早一点', 'Later': '晚一点', 'Tap along again': '再拍一次', 'Done': '好了',
    'Tap': '拍', 'Listen, and tap the drum on every boom!': '听！每次“咚”的时候拍一下鼓！',
    'Want to fine-tune? Use − and +.': '还想调一调？用 − 和 +。',
    '✔ Got it! Now the notes and the music match.': '✔ 好啦！箭头和音乐对上了。',
    'Tap along with every boom! Try again 🔁': '每次“咚”都要拍哦！再来一次 🔁',
    '🔇 The sound is off: turn it on to hear the drum.': '🔇 声音关着：打开声音才听得到鼓。',
    // the ? panel (js/keys.js)
    'Teddy (left)': 'Teddy（左边）', 'Tommy (right)': 'Tommy（右边）',
    'dance: 🔥 NORMAL': '跳舞：🔥 普通', 'dance: 🐣 EASY': '跳舞：🐣 简单', 'hold a long note': '长箭头要按住',
    'hold the key': '按住不放', 'pick a song': '选歌', 'level 🐣 / 🔥': '难度 🐣 / 🔥', 'who dances': '谁来跳',
    'dance! · again': '跳舞！· 再来', 'timing (tap along)': '节拍校准（跟着拍）',
    'Hit the key as an arrow lands on its target. With 1 dancer, both sets of keys work and T or Enter calls your brother.':
      '箭头落到靶子上的时候按键。一个人跳的时候两套按键都能用，T 或回车叫兄弟来帮忙。',
    "Tap the big pads at the bottom as the arrows land on them. Tap your brother's face to call him.":
      '箭头落到下面的大按钮上时，就拍一下。点兄弟的头像叫他来。',
  });

  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  L.rule(/^(\S+) SAYS: FOLLOW ME!$/, '$1 说：跟我跳！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (.+)!$/, (m, emoji, item, who) => `${emoji} ${who} 给你${TREAT[item]}！`);
  L.rule(/^🔥 (\d+) COMBO!$/, '🔥 $1 连击！');
  L.rule(/^💤 (\S+) IS TIRED!$/, '💤 $1 跳累了！');
  L.rule(/^🏆 (\S+) WINS!$/, '🏆 $1 赢啦！');
  L.rule(/^([+-]?\d+) ms$/, '$1 毫秒');
})();
