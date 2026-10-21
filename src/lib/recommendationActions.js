export async function setRecommendationHidden(client,uid,trackId,hidden){
 if(!uid||typeof trackId!=="string"||!trackId)throw Error("Invalid recommendation.");
 const owner=async()=>{const user=await client.auth.me();if(user?.id!==uid||user.disabled||user.is_blocked)throw Error("Your account changed. Reopen Home before continuing.");};
 const query={user_id:uid,track_id:trackId};
 const read=async()=>{await owner();const page=await client.entities.RecommendationDismissal.filter(query,"-created_date",1);const rows=Array.isArray(page)?page:page?.items;if(!Array.isArray(rows))throw Error("Could not confirm this preference.");return rows;};
 const before=await read();if(!!before.length===hidden)return before;
 let failure;try{await owner();if(hidden)await client.entities.RecommendationDismissal.create(query);else await client.entities.RecommendationDismissal.deleteMany(query);}catch(error){failure=error;}
 const after=await read();if(!!after.length!==hidden)throw failure||Error("Recommendation preference was not confirmed.");return after;
}
