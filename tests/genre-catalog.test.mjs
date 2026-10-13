import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(path,'utf8');
const extract = path => JSON.parse(read(path).match(/(?:export )?const GENRES = (\[[\s\S]*?\]);/)[1]);
const genres=extract('src/lib/audio-utils.js');
assert.equal(new Set(genres).size,genres.length,'genre labels must be unique');
assert.ok(genres.includes('Sexy Drill'));
assert.equal(genres.at(-1),'Other');
for(const name of ['Track','Album']){
 const schema=read('base44/entities/'+name+'.jsonc');
 const values=JSON.parse(schema.match(/"genre"\s*:\s*\{[\s\S]*?"enum"\s*:\s*(\[[\s\S]*?\])/)[1]);
 assert.deepEqual(values,genres,name+' accepts every selectable genre');
}
for(const name of ['detectGenre','classifyGenres']){
 assert.deepEqual(extract('base44/functions/'+name+'/entry.ts'),genres,name+' uses the same catalog');
}
console.log('PASS 7 genre catalog checks: unique labels, Sexy Drill, fallback, both entity enums, both AI classifiers');
