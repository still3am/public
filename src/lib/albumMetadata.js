// Loaded only while analyzing an upload; no AI or network lookup is needed.
export async function extractAlbumMetadata(file){
 try{
  const {parseBlob}=await import('music-metadata');
  const {common}=await parseBlob(file,{skipCovers:true,duration:false});
  const number=value=>Number.isInteger(value)&&value>0&&value<10000?value:0;
  return {album_name:String(common.album||'').trim().slice(0,300),album_artist:String(common.albumartist||'').trim().slice(0,300),track_number:number(common.track?.no),disc_number:number(common.disk?.no),release_year:common.year>=1900&&common.year<=2200?common.year:0};
 }catch{return {album_name:'',album_artist:'',track_number:0,disc_number:0,release_year:0};}
}
