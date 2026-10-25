import assert from 'node:assert/strict';
import {serviceNotificationLink} from '../src/lib/serviceNotificationLink.js';
assert.deepEqual(serviceNotificationLink({type:'music_request_available',track_id:'song-123',target_path:'/suggestions'}),{to:'/track/song-123',label:'Listen on PUBLIC'});
assert.deepEqual(serviceNotificationLink({type:'music_request_available',track_id:'https://evil.example'}),{to:'/music-requests',label:'View music requests'});
assert.equal(serviceNotificationLink({type:'support_reply',target_path:'/support?ticket=id'}).to,'/support?ticket=id');
assert.equal(serviceNotificationLink({type:'support_reply',target_path:'//evil.example'}).to,'/support');
assert.equal(serviceNotificationLink({type:'suggestion_shipped',target_path:'/suggestions?idea=id'}).to,'/suggestions?idea=id');
assert.equal(serviceNotificationLink({type:'track_shared',track_id:'song'}),null);
console.log('PASS music availability notices open the song and existing service notices preserve safe destinations');
