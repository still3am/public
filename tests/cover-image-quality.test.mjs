import assert from 'node:assert/strict';
import fs from 'node:fs';
const {ensureHighResCover,getCoverImageDimensions}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('src/lib/coverImage.js','utf8')).toString('base64'));
const source=new Blob([new Uint8Array([1,2,3,4])],{type:'image/jpeg'});
assert.equal(ensureHighResCover(source),source,'keep original image bytes; do not upscale and recompress');
const original=globalThis.createImageBitmap;let closed=false;
try{
 globalThis.createImageBitmap=async()=>({width:640,height:640,close(){closed=true;}});
 assert.deepEqual(await getCoverImageDimensions(source),{width:640,height:640});
 assert.equal(closed,true,'release decoded bitmap memory');
 globalThis.createImageBitmap=async()=>{throw Error('unsupported image')};
 assert.equal(await getCoverImageDimensions(source),null,'invalid images fail safely');
}finally{globalThis.createImageBitmap=original;}
console.log('PASS original artwork is preserved without fake 4K upscaling; source dimensions are measured safely');
