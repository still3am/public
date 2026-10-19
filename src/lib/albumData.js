import {base44} from '@/api/base44Client';
import {readAllPages} from '@/lib/readPages';
export async function linkedAlbumRecords(tracks){
 const ids=[...new Set(tracks.map(t=>t.album_id).filter(Boolean))],records=[];
 for(let i=0;i<ids.length;i+=100)records.push(...await readAllPages(opts=>base44.entities.Album.filter({id:{$in:ids.slice(i,i+100)}},opts)));
 return records;
}
