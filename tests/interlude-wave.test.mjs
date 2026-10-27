import assert from 'node:assert/strict';
import fs from 'node:fs';
const context=fs.readFileSync('src/context/PlayerContext.jsx','utf8');assert.ok(!context.includes('createBiquadFilter'),'removed equalizer contributes no filters');assert.ok(context.includes('analyser.connect(pureGraph.input)'),'audio still reaches PURE and the volume output');
for(const path of ['src/components/PlayerBar.jsx','src/components/FullScreenPlayer.jsx'])assert.ok(!fs.readFileSync(path,'utf8').includes('StemMixer'),'no equalizer entry point remains');
console.log('PASS equalizer removal preserves audio routing');
