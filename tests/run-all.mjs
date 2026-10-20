import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=fs.readdirSync(new URL('./',import.meta.url)).filter(name=>name.endsWith('.test.mjs')).sort();
let failed=0;
for(const file of files){
 const result=spawnSync(process.execPath,[new URL(file,import.meta.url).pathname],{encoding:'utf8',timeout:60000});
 if(result.status===0)console.log('PASS '+file);
 else{failed++;console.error('FAIL '+file);console.error(result.error||result.stderr||result.stdout);}
}
console.log(`${files.length-failed}/${files.length} test suites passed`);
process.exitCode=failed?1:0;
