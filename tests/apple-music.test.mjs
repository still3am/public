import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {createAppleDeveloperToken} from '../scripts/create-apple-music-token.mjs';
import {validateAppleToken,appleArtwork,searchAppleMusic,loadAppleMusic,authorizeAppleMusic,disconnectAppleMusic} from '../src/lib/appleMusic.js';
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const now=Math.floor(Date.now()/1000),origin='https://publicnet.base44.app';
const token=createAppleDeveloperToken({teamId:'TEAM123456',keyId:'KEY1234567',privateKey:privateKey.export({format:'pem',type:'pkcs8'}),origins:[origin],now});
const parts=token.split('.'),claims=JSON.parse(Buffer.from(parts[1],'base64url').toString());
assert.equal(Buffer.from(parts[2],'base64url').length,64);
assert.equal(verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url')),true);
assert.equal(claims.iss,'TEAM123456');assert.deepEqual(claims.origin,[origin]);assert.equal(claims.exp,now+30*86400);
assert.equal(validateAppleToken(token,origin),token);
assert.throws(()=>validateAppleToken(token,'https://different.test'),/setup/);
assert.throws(()=>validateAppleToken(token,origin,(claims.exp+1)*1000),/renewal/);
assert.throws(()=>createAppleDeveloperToken({teamId:'bad',keyId:'bad',privateKey:'bad',origins:[origin]}),/10-character/);
assert.throws(()=>createAppleDeveloperToken({teamId:'TEAM123456',keyId:'KEY1234567',privateKey:'bad',origins:['http://insecure.test']}),/HTTPS/);
const originalFetch=globalThis.fetch,originalWindow=globalThis.window;
let authCalls=0,unauthCalls=0,finishAuth,config;
const music={storefrontId:'us',isAuthorized:false,stop:async()=>{},unauthorize:async()=>{music.isAuthorized=false;unauthCalls++;},authorize:async()=>{authCalls++;await new Promise(resolve=>finishAuth=resolve);music.isAuthorized=true;return 'USER_TOKEN_NOT_STORED';},api:{music:async(path,params)=>{
 assert.equal(path,'/v1/catalog/us/search');assert.equal(params.types,'songs');
 return {data:{results:{songs:{data:[{id:'1',type:'songs',attributes:{name:'Clean'}},{id:'2',type:'songs',attributes:{name:'Explicit',contentRating:'explicit'}}]}}}};
}}};
try{
 globalThis.window={location:{origin},MusicKit:{configure:async options=>config=options,getInstance:()=>music}};
 globalThis.fetch=async url=>{assert.equal(url,'/apple-music-config.json');return Response.json({developerToken:token});};
 const instance=await loadAppleMusic();assert.equal(instance,music);assert.equal(config.developerToken,token);assert.equal(config.app.name,'Public');
 assert.equal((await searchAppleMusic(music,'song',{show_explicit:false})).length,1);
 assert.equal((await searchAppleMusic(music,'song',{show_explicit:true,adult_confirmed:true})).length,2);
 assert.equal((await searchAppleMusic(music,'song',{show_explicit:true,adult_confirmed:false})).length,1);
 assert.equal(appleArtwork({attributes:{artwork:{url:'https://is1-ssl.mzstatic.com/a/{w}x{h}.jpg'}}}),'https://is1-ssl.mzstatic.com/a/160x160.jpg');
 assert.equal(appleArtwork({attributes:{artwork:{url:'https://mzstatic.com.evil.test/a.jpg'}}}),'');
 const oldAuthorization=authorizeAppleMusic(music);
 await assert.rejects(()=>authorizeAppleMusic(music),/existing/);
 await disconnectAppleMusic();finishAuth();
 await assert.rejects(oldAuthorization,/account changed/);assert.equal(music.isAuthorized,false);assert.ok(unauthCalls>=2);assert.equal(authCalls,1);
 console.log('PASS MusicKit token ES256 signing, origin/expiry checks, catalog filtering, metadata hosts, SDK configuration and account-change authorization cancellation');
}finally{globalThis.fetch=originalFetch;globalThis.window=originalWindow;}
