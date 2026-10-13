import {readAllPages} from "@/lib/readPages";
import { useEffect, useState, useRef } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import UserRow from "@/components/admin/UserRow";
import UserCountStat from "@/components/admin/UserCountStat";

export default function UsersManager() {
  const [users, setUsers] = useState(null);
  const [uploadCounts, setUploadCounts] = useState(null);
  const [q, setQ] = useState("");
  const [busyIds,setBusyIds]=useState(new Set());
  const writes=useRef(new Set()),version=useRef(0);
  const [failed,setFailed]=useState(false);

  const load=async()=>{
    const request=++version.current;setFailed(false);
    const [list,groups]=await Promise.allSettled([
      readAllPages(opts=>base44.entities.User.filter({},{sort:"-created_date",...opts})),
      base44.entities.Track.aggregate({groupBy:"uploader_id"})
    ]);
    if(request!==version.current)return;
    if(list.status==="fulfilled")setUsers(list.value);else setFailed(true);
    if(groups.status==="fulfilled"){const counts={};(groups.value?.rows||[]).forEach(row=>{if(row.uploader_id)counts[row.uploader_id]=row.count;});setUploadCounts(counts);}
  };
  useEffect(()=>{load();return()=>{version.current++;};},[]);
  const begin=id=>{if(writes.current.has(id))return false;writes.current.add(id);setBusyIds(new Set(writes.current));return true;};
  const finish=id=>{writes.current.delete(id);setBusyIds(new Set(writes.current));};
  const toggleBlock=async user=>{
    if(!begin(user.id))return;
    try{await base44.functions.invoke("safety",{action:"suspend",user_id:user.id,blocked:!user.is_blocked});setUsers(previous=>previous.map(row=>row.id===user.id?{...row,is_blocked:!user.is_blocked}:row));}
    catch{/* Keep the confirmed account state. */}finally{finish(user.id);}
  };
  const remove=async user=>{
    if(writes.current.has(user.id)||!window.confirm(`Delete ${user.display_name||user.full_name||user.email}? This cannot be undone.`)||!begin(user.id))return;
    try{await base44.entities.User.delete(user.id);setUsers(previous=>previous.filter(row=>row.id!==user.id));}
    catch{/* Keep the account in the list if deletion did not succeed. */}finally{finish(user.id);}
  };

  const term = q.trim().toLowerCase();
  const filtered = (users || []).filter(
    (u) =>
      !term ||
      (u.full_name || "").toLowerCase().includes(term) ||
      (u.display_name || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term)
  );

  if (!users) {
    return (
      <div className="py-16 grid place-items-center">
        {failed?<button className="playlist-action" onClick={load}>Refresh users</button>:<Loader2 size={20} className="animate-spin text-foreground/40" />}
      </div>
    );
  }

  return (
    <div>
      <UserCountStat confirmedCount={users.length}/>
      <button className="playlist-action text-xs mb-3" onClick={load}>Refresh users</button>
      <div className="relative mb-2">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
        <Input
          aria-label="Search registered users"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users"
          className="pl-9 h-10 rounded-xl"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-14 text-center text-foreground/50">
          <Users size={26} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No users found.</p>
        </div>
      ) : (
        <div>
          {filtered.map((u) => (
            <UserRow
              key={u.id}
              u={u}
              uploads={uploadCounts?uploadCounts[u.id]||0:null}
              busy={busyIds.has(u.id)}
              onToggleBlock={toggleBlock}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}