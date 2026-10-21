const key=uid=>"public:search-history:"+(uid||"guest");
export function readSearchHistory(uid){try{const rows=JSON.parse(localStorage.getItem(key(uid))||"[]");return Array.isArray(rows)?rows.filter(x=>typeof x==="string"&&x.length<=100).slice(0,8):[];}catch{return [];}}
export function rememberSearch(uid,value){const term=String(value||"").trim().slice(0,100);if(term.length<2)return readSearchHistory(uid);const rows=[term,...readSearchHistory(uid).filter(x=>x.toLowerCase()!==term.toLowerCase())].slice(0,8);try{localStorage.setItem(key(uid),JSON.stringify(rows));}catch{}return rows;}
export function clearSearchHistory(uid){try{localStorage.removeItem(key(uid));}catch{}}
