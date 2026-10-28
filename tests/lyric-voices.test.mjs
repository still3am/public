import assert from 'node:assert/strict';
import {prepareVocalLines} from '../src/lib/lyricVoices.js';
const line=(text,n)=>({text,start_time_ms:n*1000});
const result=prepareVocalLines([line('[Verse 1: Drake]',0),line('First vocal',1),line('[Verse 2: Guest]',2),line('Second vocal',3),line('[Chorus: Drake]',4),line('Return',5)]);
assert.deepEqual(result.map(l=>l.vocal_side),['left','right','left']);assert.deepEqual(result.map(l=>l.speaker),['Drake','Guest','Drake']);assert.equal(result[1].start_time_ms,3000);
assert.deepEqual(prepareVocalLines([line('Unlabelled words',1)]),[line('Unlabelled words',1)]);
const duet=prepareVocalLines([line('v1: Hello',0),line('v2: Reply',1),line('[v1] Again',2)]);assert.deepEqual(duet.map(l=>l.text),['Hello','Reply','Again']);assert.deepEqual(duet.map(l=>l.vocal_side),['left','right','left']);
console.log('PASS explicit vocal sections, duet labels, singer return, timing preservation and no invented singers');
