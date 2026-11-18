// Normalized, disjoint portrait areas inside a circular group image.
export function groupAvatarLayout(count) {
  if (count <= 1) return [{x:0,y:0,size:1}];
  if (count === 2) return [{x:0.02,y:0.27,size:0.46},{x:0.52,y:0.27,size:0.46}];
  if (count === 3) return [{x:0.11,y:0.11,size:0.38},{x:0.51,y:0.11,size:0.38},{x:0.31,y:0.51,size:0.38}];
  return [{x:0.11,y:0.11,size:0.38},{x:0.51,y:0.11,size:0.38},{x:0.11,y:0.51,size:0.38},{x:0.51,y:0.51,size:0.38}];
}
