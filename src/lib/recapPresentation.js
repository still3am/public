export const RECAP_PALETTES = {
 month: ['#C23C65','#703ACA','#D77A36'],
 year: ['#194EB4','#4D2C9D','#137C95'],
 all: ['#086C69','#35318F','#B03979']
};
export function recapSelection(period, value, now = new Date()) {
 if (period === 'all' && !value) return {period, value:'', date:now};
 if (period === 'month' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) {
  const date = new Date(value + '-15T12:00:00');
  if(date.getFullYear()>=2020 && date<=now) return {period,value,date};
 }
 if (period === 'year' && /^\d{4}$/.test(value || '') && Number(value)>=2020 && Number(value)<=now.getFullYear())
  return {period,value,date:new Date(value+'-01-15T12:00:00')};
 return null;
}
export function recapMix(selection, recap) {
 const {period,value,date}=selection;
 const month=date.toLocaleDateString(undefined,{month:'long'});
 const title=period==='all'?'Your All Time Recap':period==='year'?'Your '+value+' Recap':'Your '+month+' Recap';
 const artists=[...new Set(recap.tracks.map(t=>t.artist||t.uploader_name).filter(Boolean))].slice(0,4).join(', ');
 return {id:period+'/'+value,kind:'recap',title,cardTitle:period==='all'?'All Time':period==='year'?'’'+value.slice(-2):month,periodLabel:period==='month'?'Monthly recap':period==='year'?'Yearly recap':'All time recap',palette:RECAP_PALETTES[period],artists,tracks:recap.tracks,recap,
 subtitle:recap.plays ? 'The songs you kept coming back to'+(period==='all'?'.':period==='year'?' in '+value+'.':' in '+month+' '+date.getFullYear()+'.') : 'Your soundtrack starts with a song. Listen on PUBLIC to build this recap.'};
}
