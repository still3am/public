import assert from 'node:assert/strict';
import {groupAvatarLayout} from '../src/components/messages/groupAvatarLayout.js';
for(const count of [1,2,3,4]){
  const slots=groupAvatarLayout(count);
  assert.equal(slots.length,count);
  for(const [index,slot] of slots.entries()){
    const radius=slot.size/2;
    const cx=slot.x+radius,cy=slot.y+radius;
    assert.ok(Math.hypot(cx-.5,cy-.5)+radius<=.500001,'Each portrait must fit within the group circle');
    for(const other of slots.slice(index+1)){
      const separated=slot.x+slot.size<=other.x||other.x+other.size<=slot.x||slot.y+slot.size<=other.y||other.y+other.size<=slot.y;
      assert.ok(separated,'Portraits must never overlap');
    }
  }
}
console.log('PASS group portraits stay inside their frame without overlapping for 1–4 members');
