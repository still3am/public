import assert from 'node:assert/strict';
import {rankDiscoverPeople} from '../src/lib/discoverPeople.js';
const people=[
 {id:'plain',username:'plain'},
 {id:'one',top_track_ids:['a','a']},
 {id:'two',top_track_ids:['a','b','b'],featured_track_id:'a'},
 {id:'feature',featured_track_id:'b'},
];
const result=rankDiscoverPeople(people,{top_track_ids:['a'],featured_track_id:'b'});
assert.deepEqual(result.map(p=>p.id),['two','one','feature','plain']);
assert.equal(result[0].reason,'2 songs in common');
assert.equal(result[1].reason,'1 song in common');
assert.equal(result[3].reason,'@plain');
assert.deepEqual(people.map(p=>p.id),['plain','one','two','feature']);
assert(rankDiscoverPeople(people,{}).every(p=>p.shared===0));
assert.equal(rankDiscoverPeople([{top_track_ids:'invalid',is_artist:true}],{})[0].reason,'Artist on PUBLIC');
console.log('Discover people: unique shared songs, ranking, fallbacks, stable ties and immutable input passed.');
