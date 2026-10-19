import importlib.util
s=importlib.util.spec_from_file_location("genres","maintenance/research_missing_genres.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def row(name,artist="Artist",genre="Hip-Hop/Rap",album="Album"):return {"trackName":name,"artistName":artist,"primaryGenreName":genre,"collectionName":album,"collectionViewUrl":"https://music.apple.com/test-album","trackViewUrl":"https://music.apple.com/test-song"}
assert m.match({"title":"Song","artist":"Artist"},row("Song"))
assert not m.match({"title":"Song","artist":"Artist"},row("Song","Other Artist"))
assert not m.match({"title":"Song","artist":"Marino"},row("Song","Pahola Marino"))
assert not m.match({"title":"Song","artist":"Drake"},row("Song","Drake Bell"))
for alternate in ["Song (Remix)","Song (Live)","Song (Instrumental)","Song (Sped Up)","Song (Acoustic)"]:
 assert not m.match({"title":"Song","artist":"Artist"},row(alternate))
assert m.match({"title":"Song (feat. Guest)","artist":"Artist, Guest"},row("Song","Artist & Guest"))
assert not m.match({"title":"月","artist":"Artist"},row("星"))
assert not m.match({"title":"","artist":"Artist"},row(""))
assert m.match({"title":"Song","artist":"YG"},row("Song","YG"))
t={"id":"one","title":"Another Song","artist":"Artist","genre":"Other","album_name":"Album"}
cache={"a":{"results":[row("Track One"),row("Track Two")]}}
p=m.propose([t],cache)
assert len(p["proposals"])==1 and p["proposals"][0]["match"].startswith("album-level inference")
cache["a"]["results"][1]["primaryGenreName"]="Pop"
assert not m.propose([t],cache)["proposals"]
t["album_name"]="Other Album"
assert not m.propose([t],cache)["proposals"]
print("PASS artist identity, collaborations, version separation, non-Latin titles, short artist names, consistent album inference and conflict rejection")
