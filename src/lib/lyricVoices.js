// Only source-provided vocal labels may assign a lyric to a singer.
// Multiple credited artists alone do not establish who sings each line.
export function prepareVocalLines(lines){
 const voices=new Map();let current=null;
 const voice=value=>{const label=String(value||'').trim().slice(0,80);if(!label)return null;const key=label.toLocaleLowerCase();if(!voices.has(key))voices.set(key,{label,side:voices.size%2?'right':'left'});return voices.get(key);};
 return lines.flatMap(line=>{
  let text=String(line.text||''),speaker=line.speaker||line.vocalist;
  const section=/^\[(?:verse(?:\s+\d+)?|chorus|bridge|intro|outro|pre-chorus|refrain)\s*:\s*([^\]]+)\]\s*$/i.exec(text);
  if(section){current=voice(section[1]);return [];}
  const tag=/^(?:\[v([12])\]|v([12]):)\s*/i.exec(text);
  if(tag){speaker='Vocal '+(tag[1]||tag[2]);text=text.slice(tag[0].length);}
  if(speaker)current=voice(speaker);
  const result={...line,text,...(current?{speaker:current.label,vocal_side:current.side}:{})};
  if(text!==line.text)delete result.words;
  return [result];
 });
}
