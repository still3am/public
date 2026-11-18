function chronological(items){
  return [...new Map(items.map(item=>[item.id,item])).values()].sort((a,b)=>Date.parse(a.created_date)-Date.parse(b.created_date)||a.id.localeCompare(b.id));
}
export function mergeEarlierMessages(current,earlier){return chronological([...earlier,...current]);}
export function mergeLatestMessages(current,latest){
  if(!current?.messages?.length)return chronological(latest);
  if(!latest.length)return [];
  const boundary=Math.min(...latest.map(message=>Date.parse(message.created_date)));
  const previousWindow=new Set(current.latestIds||[]);
  const older=current.messages.filter(message=>Date.parse(message.created_date)<boundary||Date.parse(message.created_date)===boundary&&!previousWindow.has(message.id));
  return chronological([...older,...latest]);
}
