import {useLocation} from 'react-router-dom';
const pages={
 '/search':['Explore','Find your next favorite track, artist, or playlist.'],
 '/library':['Your library','Saved sounds, playlists, and recent listening.'],
 '/top':['Top charts','The songs people keep coming back to.'],
 '/recent':['Recently added','Fresh sounds from the PUBLIC community.'],
 '/upload':['Upload music','Bring your sound to PUBLIC.'],
 '/downloads':['Offline music','Your saved tracks, wherever you go.'],
 '/notifications':['Notifications','Keep up with your music and your people.'],
 '/my-uploads':['Your uploads','Manage your music and follow its release status.'],
 '/records':['Public records','Explore the artists behind the music.']
};
export default function PageHeading(){
 const {pathname}=useLocation(),page=pages[pathname];
 if(!page)return null;
 return <div className="page-heading"><p className="eyebrow">PUBLIC / {pathname==='/upload'?'Create':'Your sound'}</p><h1>{page[0]}</h1><p className="page-description">{page[1]}</p></div>;
}
