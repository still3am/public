// Seasonal palettes follow the month being viewed, including archived recaps.
export const MONTHLY_RECAP_PALETTES = [
 ['#5B8DEB','#B8D7E5','#5246A2'], // January: ice
 ['#D73276','#F392B2','#713BB0'], // February: rose
 ['#25805D','#B8DB44','#437D8F'], // March: new growth
 ['#7386D8','#C184CC','#479B92'], // April: spring rain
 ['#B3D747','#DB639E','#337E5C'], // May: blooms
 ['#EE7560','#36B7B3','#B761B0'], // June: summer dusk
 ['#DB4549','#F2B83D','#3156BA'], // July: midsummer
 ['#F2AB29','#D56739','#2B9BA2'], // August: golden hour
 ['#D99C35','#747C34','#A24C61'], // September: turning leaves
 ['#F67A20','#662A89','#E3AF27'], // October: pumpkin, plum, gold
 ['#B85635','#C4943F','#6D3C4C'], // November: harvest
 ['#247965','#C33C65','#C5A351']  // December: evergreen and cranberry
];
export const RECAP_PALETTES = {
 month: ['#C23C65','#703ACA','#D77A36'],
 year: ['#194EB4','#4D2C9D','#137C95'],
 all: ['#086C69','#35318F','#B03979']
};
export function recapSelection(period, value, now = new Date()) {
 if (period === 'all' && !value) return {period, value:'', date:now};
 if (period === 'month' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) {
  const date = new Date(value + '-15T12:00:00');
  if(date.getFullYear()>=2020 && value<=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')) return {period,value,date};
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
 return {id:period+'/'+value,kind:'recap',title,cardTitle:period==='all'?'All Time':period==='year'?'’'+value.slice(-2):month,periodLabel:period==='month'?'Monthly recap':period==='year'?'Yearly recap':'All time recap',artTitle:period==='month'?month+'\nRecap':period==='year'?value+'\nRecap':'All Time\nRecap',palette:period==='month'?MONTHLY_RECAP_PALETTES[date.getMonth()]:RECAP_PALETTES[period],artists,tracks:recap.tracks,recap,
 subtitle:recap.plays ? 'The songs you kept coming back to'+(period==='all'?'.':period==='year'?' in '+value+'.':' in '+month+' '+date.getFullYear()+'.') : 'Your soundtrack starts with a song. Listen on PUBLIC to build this recap.'};
}
