export const INITIAL_CROP={zoom:1,x:0,y:0,rotation:0};
export function cropGeometry(iw,ih,w,h,c={}){
 const rotation=((Number(c.rotation)||0)%360+360)%360,turned=rotation===90||rotation===270;
 const rw=turned?ih:iw,rh=turned?iw:ih,zoom=Math.max(1,Math.min(4,Number(c.zoom)||1));
 const scale=Math.max(w/rw,h/rh)*zoom,dx=Math.max(0,(rw*scale-w)/2),dy=Math.max(0,(rh*scale-h)/2);
 return {rotation,scale,dx,dy,cx:w/2+Math.max(-1,Math.min(1,Number(c.x)||0))*dx,cy:h/2+Math.max(-1,Math.min(1,Number(c.y)||0))*dy};
}
export function drawCrop(canvas,image,crop,width,height){
 canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
 const g=cropGeometry(image.width,image.height,width,height,crop);
 ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(g.cx,g.cy);ctx.rotate(g.rotation*Math.PI/180);ctx.scale(g.scale,g.scale);ctx.drawImage(image,-image.width/2,-image.height/2);ctx.restore();return g;
}
export async function cropFile(image,crop,width,height,name){
 const canvas=document.createElement('canvas');drawCrop(canvas,image,crop,width,height);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));if(!blob)throw Error('This image could not be processed. Try another photo.');
 return new File([blob],name,{type:'image/jpeg'});
}
