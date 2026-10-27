import assert from 'node:assert/strict';
import fs from 'node:fs';
const context=fs.readFileSync('src/context/PlayerContext.jsx','utf8');assert.ok(!context.includes('createBiquadFilter'),'removed equalizer contributes no filters');assert.ok(context.includes('analyser.connect(pureGraph.input)'),'audio still reaches PURE and the volume output');
for(const path of ['src/components/PlayerBar.jsx','src/components/FullScreenPlayer.jsx'])assert.ok(!fs.readFileSync(path,'utf8').includes('StemMixer'),'no equalizer entry point remains');
console.log('PASS equalizer removal preserves audio routing');

const ts=await import('typescript'),React=await import('react');
globalThis.__dots={React,useEffect:()=>{},useRef:value=>({current:value}),useState:value=>[value,()=>{}],usePlayer:()=>({isPlaying:globalThis.__dotsPlaying})};
const source=ts.transpileModule(fs.readFileSync('src/components/LyricInterlude.jsx','utf8').replace(/^import[^;]+;/gm,''),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const Dots=(await import('data:text/javascript;base64,'+Buffer.from('const {'+Object.keys(globalThis.__dots).join(',')+'}=globalThis.__dots;'+source).toString('base64'))).default;
for(const [active,playing,moving] of [[true,true,'true'],[true,false,'false'],[false,true,'false']]){
 globalThis.__dotsPlaying=playing;const tree=Dots({active});
 assert.equal(React.Children.count(tree.props.children),3);
 assert.equal(tree.props['data-moving'],moving,'dots only animate for the playing active passage');
}
console.log('PASS three dots follow active and paused playback');
