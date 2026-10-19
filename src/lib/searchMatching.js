export function normalizeSearch(value){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");}
export function editDistance(a,b){
 if(Math.abs(a.length-b.length)>2)return 3;
 let before=Array.from({length:b.length+1},(_,i)=>i),previous;
 for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++){row[j]=Math.min(row[j-1]+1,before[j]+1,before[j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])row[j]=Math.min(row[j],previous[j-2]+1);}previous=before;before=row;}return before[b.length];
}
export function searchScore(value,query){
 const text=normalizeSearch(value),q=normalizeSearch(query);if(!q||!text)return 0;
 if(text===q)return 100;if(text.startsWith(q))return 90;if(text.includes(q))return 80;
 if(text.replaceAll(" ","").includes(q.replaceAll(" ","")))return 75;
 const words=text.split(" "),tokens=q.split(" ");
 if(tokens.every(t=>words.some(w=>w===t)))return 70;
 if(tokens.some(t=>t.length<3))return 0;
 return tokens.every(t=>words.some(w=>w.startsWith(t)||editDistance(w,t)<=(t.length>=7?2:1)))?45:0;
}
export function scoreTrack(track,query){
 return Math.max(searchScore(track.title,query),searchScore(track.artist,query)*.9,searchScore(track.uploader_name,query)*.7,normalizeSearch(query).length>=5?searchScore(track.lyrics_text,query)*.5:0);
}
