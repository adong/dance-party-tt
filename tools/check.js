#!/usr/bin/env node
/* Run the headless checks (js/checks.js) in node, without a browser: node tools/check.js
   Loads the page's own song, chart, clock and judging files, then runs every check and its proof that it can fail. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
for (const f of ['songs', 'charts', 'clock', 'engine', 'checks']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f + '.js' });
}
const out = window.DP.checks.run({ prove: true });
for (const r of out.results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : '\n      ' + r.problems.slice(0, 8).join('\n      ')}`);
for (const p of out.prove) console.log(`${p.caught ? 'ok  ' : 'FAIL'} broken ${p.name} is caught: ${p.first}`);
console.log(out.stats.join('\n'));
console.log('NORMAL, never pressing: ' + out.normalGiveUp.join('; '));
console.log(`${out.ok ? 'ALL OK' : 'PROBLEMS'} (${out.ms} ms)`);
process.exit(out.ok ? 0 : 1);
