"""Read-only web research. Writes proposals, never changes app records."""
import json,re,time,unicodedata,urllib.parse,urllib.request,urllib.error,collections,argparse,pathlib,difflib
ROOT=pathlib.Path(__file__).parent
BEFORE=ROOT/'genre-backfill-2026-10-19.before.json'
CACHE=ROOT/'genre-backfill-2026-10-19.web-cache.json'
PROPOSALS=ROOT/'genre-backfill-2026-10-19.proposals.json'
def norm(s):
 s=''.join(c for c in unicodedata.normalize('NFKD',s or '').casefold() if not unicodedata.combining(c))
 return ''.join(c for c in s if c.isalnum())
def title(s):
 s=re.sub(r'\([^)]*\b(?:feat\.?|ft\.?|with)\b[^)]*\)|\[[^]]*\b(?:feat\.?|ft\.?|with)\b[^]]*\]','',s or '',flags=re.I)
 s=re.sub(r'\b(?:feat\.?|ft\.?)\s+.*$','',s,flags=re.I)
 s=re.sub(r'\b(?:remastered(?:\s+\d{4})?|\d{4}\s+remaster(?:ed)?)\b','',s,flags=re.I)
 return norm(s)
def versions(s):
 return {k for k,p in {'remix':r'\bremix\b|\brefix\b','live':r'\blive\b','instrumental':r'\binstrumental\b','sped':r'\bsped\s*up\b|\bnightcore\b','slowed':r'\bslowed\b','acoustic':r'\bacoustic\b'}.items() if re.search(p,s or '',re.I)}
ALIASES={'Hip-Hop/Rap':'Hip-Hop','R&B/Soul':'R&B','Singer/Songwriter':'Singer/Songwriter','Singer-songwriter':'Singer/Songwriter','Latino':'Latin','Latin Urban':'Latin','Urbano latino':'Latin','Pop Latino':'Latin Pop','Latin Pop':'Latin Pop','Música Mexicana':'Regional Mexican','Regional Mexicano':'Regional Mexican','Regional Mexican':'Regional Mexican','Rock y Alternativo':'Latin Rock','Dancehall':'Dancehall','Modern Dancehall':'Dancehall','Modern Dancehall & Reggae':'Reggae Fusion','Christian':'Christian & Gospel','Christian & Gospel':'Christian & Gospel','Gospel':'Gospel','Contemporary Gospel':'Gospel','African':'World','Worldwide':'World','African Dancehall':'Dancehall','Afro-Pop':'Afropop','Afro-Beat':'Afrobeat','Afrobeats':'Afrobeats','Afro House':'Afro House','Jazz':'Jazz','Salsa y Tropical':'Latin','Salsa and Tropical':'Latin','Salsa':'Salsa','Latin Jazz':'Jazz','German Pop':'Pop','French Pop':'Pop','French Rap':'Rap','Hip-Hop':'Hip-Hop','Korean Hip-Hop':'K-Hip-Hop','Korean R&B':'K-R&B','Brazilian':'World','Sertanejo':'World','MPB':'World','Punjabi Pop':'World','Indian Pop':'World','Soundtrack':'Soundtrack','Anime':'Soundtrack','Film Soundtrack':'Soundtrack','Original Score':'Soundtrack','Vocal':'Easy Listening','Traditional Pop':'Pop','Alternative Folk':'Folk','Traditional Folk':'Folk','Contemporary Folk':'Folk','Adult Contemporary':'Pop','Pop/Rock':'Pop','Comedy':'Comedy','Jungle/Drum\u2019n\u2019bass':'Drum & Bass','Jungle/Drum\u2019n\u2019Bass':'Drum & Bass'}
ALIASES.update({'Música tropical':'Latin','Latin Rap':'Latin','West Coast Rap':'West Coast Hip-Hop','Mandopop':'Pop','Cantopop/HK-Pop':'Pop','Electronica':'Electronic','Alternative Rap':'Alternative Hip-Hop','Classical Crossover':'Classical','Roots Reggae':'Reggae','Vocal Jazz':'Jazz','Musicals':'Soundtrack','Baladas y Boleros':'Latin','Christian Rap':'Christian & Gospel','Adult Alternative':'Alternative','Christian Pop':'Christian & Gospel','IDM/Experimental':'IDM','Motown':'Soul','CCM':'Christian & Gospel','Lullabies':"Children's Music",'New Acoustic':'Acoustic','Contemporary Jazz':'Jazz',"Jungle/Drum'n'bass":'Drum & Bass','Chinese Hip-Hop':'Hip-Hop','Hardcore Rap':'Hip-Hop'})
ALLOWED=set(json.loads((pathlib.Path('/app/base44/entities/Track.jsonc')).read_text())['properties']['genre']['enum'])
def genre(g):
 if g and (g=='Christmas' or g.startswith('Christmas:')):return 'Holiday'
 if g in ALLOWED:return g if g!='Other' else None
 return ALIASES.get(g)
def artist_match(t,r):
 a=norm((t.get('artist')or'').split(',')[0]);b=norm(r.get('artistName'))
 artists={norm(part) for part in re.split(r',| & | and | feat\.? | ft\.? ',r.get('artistName')or'',flags=re.I)}
 if len(a)<2 or a.isdigit() or not b:return False
 return a==b or a in artists or {a,b}<={'blackeyedpeas','theblackeyedpeas'}
def match(t,r):
 if not r.get('trackName') or not genre(r.get('primaryGenreName')) or not artist_match(t,r):return False
 if versions(t.get('title'))!=versions(r.get('trackName')):return False
 x,y=title(t.get('title')),title(r.get('trackName'))
 return bool(x and y) and (x==y or min(len(x),len(y))>=12 and difflib.SequenceMatcher(None,x,y).ratio()>=.97)
def propose(tracks,cache):
 candidates=collections.defaultdict(list);albums=collections.defaultdict(list)
 exact=collections.defaultdict(list);prefix=collections.defaultdict(list)
 for t in tracks:
  key=title(t.get('title'));exact[key].append(t);prefix[key[:8]].append(t)
 for entry in cache.values():
  for r in entry.get('results',[]):
   if genre(r.get('primaryGenreName')):albums[norm(r.get('collectionName'))].append(r)
   key=title(r.get('trackName'));pool=exact.get(key,[]) or prefix.get(key[:8],[])
   for t in pool:
    if match(t,r):candidates[t['id']].append(r)
 out=[];unmatched=[]
 for t in tracks:
  found=candidates[t['id']]
  if not found:
   album_key=norm(t.get('album_name'))
   album_rows=[r for r in albums.get(album_key,[]) if artist_match(t,r)] if len(album_key)>=4 and not versions(t.get('title')) else []
   gs={genre(r.get('primaryGenreName')) for r in album_rows}
   if len(gs)==1 and len({title(r.get('trackName')) for r in album_rows})>=2:
    best=album_rows[0]
    out.append({'id':t['id'],'title':t['title'],'artist':t.get('artist',''),'before':t.get('genre'),'genre':next(iter(gs)),'source_genre':best['primaryGenreName'],'source_title':None,'source_artist':best.get('artistName'),'source_album':best.get('collectionName'),'source_url':best.get('collectionViewUrl'),'match':'album-level inference: existing artist/album and consistent catalog labels'})
   else:unmatched.append(t)
   continue
  album_matches=[r for r in found if t.get('album_name') and norm(t.get('album_name'))==norm(r.get('collectionName'))]
  if album_matches:found=album_matches
  ranked=sorted(found,key=lambda r:(norm(t['title'])!=norm(r.get('trackName')),title(t['title'])!=title(r.get('trackName')),norm(t.get('album_name'))!=norm(r.get('collectionName')),r.get('collectionName','').lower().endswith('single')==False))
  best=ranked[0];gs={genre(r.get('primaryGenreName')) for r in found if title(t['title'])==title(r.get('trackName'))}
  # Different editions may carry different primary labels. Defer these for manual review.
  if len(gs)>1:unmatched.append({**t,'review_reason':'conflicting catalog genres','candidate_genres':sorted(gs)});continue
  out.append({'id':t['id'],'title':t['title'],'artist':t.get('artist',''),'before':t.get('genre'),'genre':genre(best['primaryGenreName']),'source_genre':best['primaryGenreName'],'source_title':best['trackName'],'source_artist':best.get('artistName'),'source_album':best.get('collectionName'),'source_url':best.get('trackViewUrl') or best.get('collectionViewUrl'),'match':'exact artist and title' if title(t['title'])==title(best['trackName']) else 'artist and near-exact title'})
 return {'proposals':out,'unmatched':unmatched,'searched_terms':len(cache)}
def main():
 args=argparse.ArgumentParser();args.add_argument('--batch',type=int,default=20);args.add_argument('--mode',default='artist');opts=args.parse_args()
 tracks=json.loads(BEFORE.read_text())['tracks'];cache=json.loads(CACHE.read_text()) if CACHE.exists() else {}
 recovered=json.loads(pathlib.Path('/app/src/data/recoveredAlbumMetadata.json').read_text())
 tracks=[{**t,'album_name':t.get('album_name') or recovered.get(t['id'],{}).get('album_name','')} for t in tracks]
 counts=collections.Counter((t.get('artist')or'').split(',')[0].strip() for t in tracks)
 state=propose(tracks,cache)
 if opts.mode=='artist':
  needed={t['artist'].split(',')[0].strip() for t in state['unmatched'] if not t.get('review_reason')}
  terms=[]
  for a,n in counts.most_common():
   if not a or a not in needed or 'artistTerm|'+a in cache:continue
   one=next(t for t in tracks if t['artist'].split(',')[0].strip()==a)
   terms.append(((a+' '+re.sub(r'\([^)]*\)|\[[^]]*\]','',one['title'])).strip(),'mixTerm') if n==1 else (a,'artistTerm'))
 else:terms=[(((t.get('artist')or'').split(',')[0]+' '+re.sub(r'\([^)]*\)|\[[^]]*\]','',t['title'])).strip(),'mixTerm') for t in state['unmatched'] if not t.get('review_reason')]
 todo=[(term,attribute) for term,attribute in terms if attribute+'|'+term not in cache][:opts.batch]
 for term,attribute in todo:
  started=time.monotonic();query={'term':term,'entity':'song','media':'music','limit':200 if attribute=='artistTerm' else 15,'country':'US','explicit':'Yes'}
  if attribute=='artistTerm':query['attribute']=attribute
  url='https://itunes.apple.com/search?'+urllib.parse.urlencode(query)
  try:
   with urllib.request.urlopen(url,timeout=20) as response:data=json.load(response)
   keep=['trackName','artistName','collectionName','primaryGenreName','trackViewUrl','collectionViewUrl','trackId']
   results=[{k:r.get(k) for k in keep} for r in data.get('results',[]) if r.get('kind')=='song']
   cache[attribute+'|'+term]={'query_url':url,'results':results}
   CACHE.write_text(json.dumps(cache,ensure_ascii=False,indent=2))
   print(json.dumps({'term':term,'results':len(results)},ensure_ascii=False),flush=True)
  except urllib.error.HTTPError as error:
   print(json.dumps({'term':term,'error':error.code}),flush=True)
   if error.code in [403,429]:break
   cache[attribute+'|'+term]={'query_url':url,'results':[],'error':error.code}
  except Exception as error:print(json.dumps({'term':term,'error':str(error)}),flush=True)
  time.sleep(max(0,3.2-(time.monotonic()-started)))
 state=propose(tracks,cache);PROPOSALS.write_text(json.dumps(state,ensure_ascii=False,indent=2))
 print(json.dumps({'searched':len(cache),'proposed':len(state['proposals']),'unmatched':len(state['unmatched']),'remaining_queries':sum(attribute+'|'+term not in cache for term,attribute in terms),'genre_counts':dict(collections.Counter(p['genre'] for p in state['proposals']))}),flush=True)
if __name__=='__main__':main()
