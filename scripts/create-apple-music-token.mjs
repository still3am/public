import {readFileSync,writeFileSync} from 'node:fs';
import {createPrivateKey,sign} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export function createAppleDeveloperToken({teamId,keyId,privateKey,origins,days=30,now=Math.floor(Date.now()/1000)}){
 if(!/^[A-Z0-9]{10}$/.test(teamId||'')||!/^[A-Z0-9]{10}$/.test(keyId||''))throw Error('Use the 10-character Apple Team ID and Media Services Key ID.');
 if(!Number.isInteger(days)||days<1||days>180)throw Error('Token lifetime must be 1–180 days.');
 if(!Array.isArray(origins)||!origins.length)throw Error('At least one Public website origin is required.');
 for(const value of origins){const url=new URL(value);if(url.protocol!=='https:'||url.origin!==value)throw Error('Use HTTPS origins without a trailing slash or path.');}
 const key=createPrivateKey(privateKey);
 if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw Error('Use the P-256 Media Services private key downloaded from Apple.');
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const header=encode({alg:'ES256',kid:keyId,typ:'JWT'});
 const payload=encode({iss:teamId,iat:now-30,exp:now+days*86400,origin:origins});
 const data=header+'.'+payload;
 return data+'.'+sign('sha256',Buffer.from(data),{key,dsaEncoding:'ieee-p1363'}).toString('base64url');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const args=process.argv.slice(2),read=name=>args[args.indexOf(name)+1];
  if(!args.includes('--key-file')||!args.includes('--team-id')||!args.includes('--key-id'))throw Error('Usage: node scripts/create-apple-music-token.mjs --key-file /secure/AuthKey.p8 --team-id TEAMID1234 --key-id KEYID12345 [--origins https://publicnet.base44.app] [--days 30]');
  const developerToken=createAppleDeveloperToken({teamId:read('--team-id'),keyId:read('--key-id'),privateKey:readFileSync(read('--key-file'),'utf8'),origins:args.includes('--origins')?read('--origins').split(','):['https://publicnet.base44.app'],days:args.includes('--days')?Number(read('--days')):30});
  writeFileSync('public/apple-music-config.json',JSON.stringify({developerToken})+'\n');
  console.log('Apple Music developer token saved. Private key was not copied or logged.');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
