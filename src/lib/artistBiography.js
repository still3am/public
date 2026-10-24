async function json(url){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('Biography unavailable');return await response.json();}finally{clearTimeout(timeout);}
}
export function biographyLink(relations){
 for(const relation of relations||[]){
  try{const url=new URL(relation.url?.resource);if(url.hostname==='en.wikipedia.org'&&url.pathname.startsWith('/wiki/'))return {title:decodeURIComponent(url.pathname.slice(6))};}catch{}
 }
 for(const relation of relations||[]){
  try{const url=new URL(relation.url?.resource);const id=url.pathname.match(/^\/wiki\/(Q\d+)$/)?.[1];if((url.hostname==='www.wikidata.org'||url.hostname==='wikidata.org')&&id)return {wikidata:id};}catch{}
 }
 return null;
}
export async function loadArtistBiography(link){
 if(!link)return null;
 let title=link.title;
 if(!title&&link.wikidata){
  const result=await json('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:link.wikidata,props:'sitelinks',sitefilter:'enwiki',format:'json',origin:'*'}));
  title=result.entities?.[link.wikidata]?.sitelinks?.enwiki?.title;
 }
 if(!title)return null;
 const result=await json('https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',prop:'extracts|pageprops',exintro:'1',explaintext:'1',exsentences:'5',redirects:'1',titles:title,format:'json',origin:'*'}));
 const page=Object.values(result.query?.pages||{})[0];
 if(!page||page.missing!==undefined||page.pageprops?.disambiguation!==undefined||!page.extract?.trim())return null;
 return {text:page.extract.trim(),url:'https://en.wikipedia.org/wiki/'+encodeURIComponent(page.title.replace(/ /g,'_'))};
}
