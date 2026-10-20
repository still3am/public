// Only compare the public profile rotation with the viewer's own selections.
export function rankDiscoverPeople(people,viewer){
 const ids=new Set(Array.isArray(viewer?.top_track_ids)?viewer.top_track_ids:[]);
 if(viewer?.featured_track_id)ids.add(viewer.featured_track_id);
 return people.map(person=>{
  const favorites=new Set(Array.isArray(person.top_track_ids)?person.top_track_ids:[]);
  if(person.featured_track_id)favorites.add(person.featured_track_id);
  const shared=[...favorites].filter(id=>ids.has(id)).length;
  return {...person,shared,reason:shared===1?"1 song in common":shared>1?shared+" songs in common":person.username?"@"+person.username:person.is_artist?"Artist on PUBLIC":"Listener on PUBLIC"};
 }).sort((a,b)=>b.shared-a.shared);
}
