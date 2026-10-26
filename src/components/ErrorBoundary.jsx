import {Component} from 'react';
export default class ErrorBoundary extends Component {
 state={error:false};
 static getDerivedStateFromError(){return {error:true};}
 componentDidCatch(error){console.error('PUBLIC screen error',error);}
 componentDidUpdate(previous){if(this.state.error && previous.resetKey!==this.props.resetKey)this.setState({error:false});}
 render(){
  if(!this.state.error)return this.props.children;
  const page=this.props.scope==="page";
  return <div role="alert" className="max-w-md mx-auto my-8 p-6 rounded-2xl border border-border space-y-4">
   <h1 className="text-xl font-semibold">{page?"This page could not load":"This screen could not load"}</h1>
   <p className="text-sm text-muted-foreground">Your saved data is unchanged. {page?"Try this page again or open another page from the navigation.":"Reload PUBLIC or contact support if this continues."}</p>
   <button type="button" className="border rounded-full px-4 py-3 min-h-11" onClick={()=>page?this.setState({error:false}):window.location.reload()}>{page?"Retry this page":"Reload PUBLIC"}</button>
   <a className="block underline text-sm" href="/support">Contact support</a>
  </div>;
 }
}
