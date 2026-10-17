import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
globalThis.__React=React;
globalThis.__playlist={id:'p1',creator_id:'owner',name:'Night drive',is_public:true,track_ids:['a','b']};
globalThis.__tracks=[{id:'a',title:'First song',artist:'One',duration_seconds:120},{id:'b',title:'Second song',artist:'Two',duration_seconds:180}];
const source=fs.readFileSync('src/pages/PlaylistDetail.jsx','utf8').replace(/^import[^;]+;/gm,'')
 .replace('[playlist,setPlaylist]=useState(null)','[playlist,setPlaylist]=useState(globalThis.__playlist)')
 .replace('[tracks,setTracks]=useState([])','[tracks,setTracks]=useState(globalThis.__tracks)')
 .replace('[managing,setManaging]=useState(false)','[managing,setManaging]=useState(globalThis.__managing||false)')
 .replace("[query,setQuery]=useState('')","[query,setQuery]=useState(globalThis.__query||'')")
 .replace('[error,setError]=useState(false)','[error,setError]=useState(globalThis.__error||false)');
const stubs=`
const React=globalThis.__React;
const {useState,useEffect,useMemo,useCallback,useRef}=React;
const useParams=()=>({id:globalThis.__route||'p1'}),useNavigate=()=>()=>{},useAuth=()=>({user:{id:globalThis.__viewer||'owner'}}),usePlayer=()=>({}),useToast=()=>({toast(){}}),useCoverUrl=v=>v;
const base44={},readAllPages=()=>{},shareLink=()=>{},removePlaylistTracks=()=>{},reorderPlaylistTracks=()=>{},movePlaylistTrack=()=>{},shufflePlaylist=v=>v;
const Play=()=>null,Shuffle=Play,Plus=Play,Pencil=Play,Trash2=Play,Share2=Play,ListMusic=Play,Search=Play,ArrowUp=Play,ArrowDown=Play,X=Play,Check=Play,Loader2=Play,ImagePlus=Play,ChevronLeft=Play,MoreHorizontal=Play,Copy=Play;
const PlaylistActionsSheet=()=>null,AddToPlaylistPicker=()=>null,EmptyState=({title})=>React.createElement('p',null,title),LoadError=()=>React.createElement('p',null,'Retry loading');
const TrackRow=({track,queue,queueIndex})=>{globalThis.__rows.push({id:track.id,queue:queue.map(t=>t.id),queueIndex});return React.createElement('p',null,track.title);};
`;
const code=ts.transpileModule(stubs+source,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const ui=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function render(){globalThis.__rows=[];return renderToStaticMarkup(React.createElement(ui.default));}
let html=render();
assert.match(html,/Night drive/);assert.match(html,/Edit songs/);
assert.doesNotMatch(html,/aria-label="Select First song"|Move First song|Remove First song|Select visible/);
globalThis.__managing=true;html=render();
assert.match(html,/aria-label="Select First song"/);assert.match(html,/Move First song up/);assert.match(html,/Remove First song from playlist/);assert.match(html,/Select visible/);
globalThis.__viewer='visitor';html=render();
assert.doesNotMatch(html,/aria-label="Select First song"|Move First song|Remove First song|Edit songs/);
assert.match(html,/Save playlist to library/);
globalThis.__viewer='owner';globalThis.__managing=false;globalThis.__query='Second';html=render();
assert.doesNotMatch(html,/First song/);assert.match(html,/Second song/);
assert.deepEqual(globalThis.__rows,[{id:'b',queue:['a','b'],queueIndex:1}],'search keeps the original playback queue and song position');
globalThis.__route='p2';globalThis.__error=true;html=render();
assert.match(html,/Retry loading/);assert.doesNotMatch(html,/Night drive/);
console.log('PASS compact listening, owner-only editing, filtered playback mapping, and failed route-change recovery');
