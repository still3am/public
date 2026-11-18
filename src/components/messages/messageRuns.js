export function messageRunPosition(messages,index) {
  const current=messages[index];
  const sameRun=other=>{
    if(!current||!other||current.sender_id!==other.sender_id)return false;
    const currentTime=Date.parse(current.created_date),otherTime=Date.parse(other.created_date);
    return Number.isFinite(currentTime)&&Number.isFinite(otherTime)&&Math.abs(currentTime-otherTime)<=300000&&new Date(currentTime).toDateString()===new Date(otherTime).toDateString();
  };
  return {start:!sameRun(messages[index-1]),end:!sameRun(messages[index+1])};
}
