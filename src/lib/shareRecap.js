export function recapCardLines(mix){return {title:mix.title,artist:mix.recap.artist||"Your next favorite awaits",stats:[mix.recap.plays.toLocaleString()+" plays",mix.recap.unique.toLocaleString()+" songs",Math.floor(mix.recap.seconds/60).toLocaleString()+" minutes"],songs:mix.tracks.slice(0,5).map((track,i)=>({rank:String(i+1).padStart(2,"0"),title:track.title||"Untitled",artist:track.artist||track.uploader_name||""}))};}
export async function renderRecapCard(mix){
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext("2d");if(!ctx)throw Error("Image creation is unavailable on this device.");
 const data=recapCardLines(mix),gradient=ctx.createLinearGradient(0,0,1080,1350);mix.palette.forEach((color,i)=>gradient.addColorStop(i/(mix.palette.length-1),color));ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle="rgba(0,0,0,.35)";ctx.fillRect(0,0,1080,1350);ctx.textBaseline="top";
 const fit=(text,size,width)=>{ctx.font="700 "+size+"px system-ui, sans-serif";while(ctx.measureText(text).width>width&&size>24){size-=2;ctx.font="700 "+size+"px system-ui, sans-serif";}return size;};
 const text=(value,x,y,size=32,weight=500,color="#fff",width=912)=>{ctx.fillStyle=color;ctx.font=weight+" "+size+"px system-ui, sans-serif";let line=String(value);while(ctx.measureText(line).width>width&&line.length>1)line=line.slice(0,-2);if(line!==String(value))line+="…";ctx.fillText(line,x,y);};
 text("public.",72,64,72,800);text("YOUR MUSIC, REMEMBERED",76,165,24,700);
 const titleSize=fit(data.title,66,920);text(data.title,72,242,titleSize,800);
 text("TOP ARTIST",76,365,22,700,"rgba(255,255,255,.7)");text(data.artist,72,407,48,800);
 ctx.fillStyle="rgba(0,0,0,.23)";ctx.fillRect(72,510,936,110);data.stats.forEach((value,i)=>text(value,96+i*304,550,27,700,"#fff",280));
 text("YOUR TOP SONGS",76,674,23,700,"rgba(255,255,255,.7)");
 if(!data.songs.length)text("Every soundtrack starts with a song.",76,750,32,600);
 data.songs.forEach((song,i)=>{const y=735+i*94;text(song.rank,76,y+5,28,700,"rgba(255,255,255,.6)",64);text(song.title,152,y,35,700,"#fff",850);text(song.artist,152,y+45,23,500,"rgba(255,255,255,.75)",850);});
 text("Listen. Discover. Make it PUBLIC.",76,1265,25,600,"rgba(255,255,255,.85)");
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Your recap image could not be created.")),"image/png"));
}
