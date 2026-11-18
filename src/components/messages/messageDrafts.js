const prefix='public:message-drafts:';
export function readMessageDrafts(storage,userId){
  if(!storage||!userId)return new Map();
  try{
    const saved=JSON.parse(storage.getItem(prefix+userId)||'[]');
    if(!Array.isArray(saved))return new Map();
    return new Map(saved.filter(item=>Array.isArray(item)&&item.length===2&&typeof item[0]==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(item[0])&&typeof item[1]==='string'&&item[1].length>0&&item[1].length<=2000).slice(-30));
  }catch{return new Map();}
}
export function writeMessageDrafts(storage,userId,drafts){
  if(!storage||!userId)return;
  try{
    const values=[...drafts].filter(([id,text])=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id)&&typeof text==='string'&&text.length>0&&text.length<=2000).slice(-30);
    if(values.length)storage.setItem(prefix+userId,JSON.stringify(values));
    else storage.removeItem(prefix+userId);
  }catch{}
}
