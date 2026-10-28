import assert from 'node:assert/strict';
import {applyAlignedLyrics,lyricTextKey} from '../src/lib/alignedLyrics.js';
import recordings from '../src/data/alignedWordTimings.js';
import {parseLrc} from '../src/lib/lyricsCatalog.js';
const track={audio_url:'https://example.org/'+recordings[0].file,duration_seconds:recordings[0].duration};
assert.equal(lyricTextKey("Don't"),lyricTextKey('Don’t'));
const source={record:{lines:parseLrc('[00:01.00]Unrelated words\n[00:02.00]Next line',5)}};
assert.equal(applyAlignedLyrics(source,track),source,'mismatched text must never use stored timings');
assert.equal(applyAlignedLyrics(source,{...track,audio_url:'https://example.org/another-file.mp3'}),source);
assert.equal(applyAlignedLyrics(source,{...track,duration_seconds:10}),source);
for(const record of recordings)for(const [,at,words]of record.segments){assert.ok(at>=0);for(const [a,b]of words)assert.ok(a>=0&&b>a&&b<=record.duration*1000+2000);}
console.log('PASS exact recording, duration and text guards; valid generated word boundaries');
