export const GLASS_MODES=["off","clear","tinted"];
export const normalizeGlass=value=>GLASS_MODES.includes(value)?value:"off";
export const glassKey=uid=>"public-liquid-glass:"+encodeURIComponent(uid||"guest");
const memory=new Map();
export function readGlass(uid,storage){
 const key=glassKey(uid);
 try{const raw=storage.getItem(key);const mode=normalizeGlass(raw);memory.set(key,mode);return mode;}
 catch{return memory.get(key)||"off";}
}
export function saveGlass(uid,value,storage){
 const mode=normalizeGlass(value),key=glassKey(uid);memory.set(key,mode);
 try{storage.setItem(key,mode);return {mode,persisted:storage.getItem(key)===mode};}
 catch{return {mode,persisted:false};}
}
