// Keep native sharing within the click gesture, and report copying only on success.
export async function copyText(text) {
  if(navigator.clipboard?.writeText){
    try{await navigator.clipboard.writeText(text);return;}catch{}
  }
  const active=document.activeElement,input=document.createElement('textarea');
  input.value=text;input.readOnly=true;input.setAttribute('aria-hidden','true');
  Object.assign(input.style,{position:'fixed',left:'-10000px',top:'0',fontSize:'16px'});
  document.body.appendChild(input);
  let copied=false;
  try{input.select();input.setSelectionRange(0,input.value.length);copied=document.execCommand('copy');}
  finally{input.remove();if(active?.isConnected)active.focus?.({preventScroll:true});}
  if(!copied)throw Error('Clipboard unavailable');
}
export async function shareLink(data) {
  if(navigator.share){
    try{await navigator.share(data);return 'shared';}
    catch(error){if(error?.name==='AbortError')return 'cancelled';}
  }
  await copyText(data.url);
  return 'copied';
}
