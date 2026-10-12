import {Component} from 'react';
export default class ErrorBoundary extends Component {
 state={error:false};
 static getDerivedStateFromError(){return {error:true};}
 componentDidCatch(error){console.error('PUBLIC screen error',error);}
 render(){return this.state.error?<div className="max-w-md mx-auto p-8 space-y-4"><h1 className="text-xl font-bold">This screen could not load</h1><p>Your saved account data has not been changed. Reload or contact support if this continues.</p><button className="border rounded-xl p-3" onClick={()=>window.location.reload()}>Reload PUBLIC</button><a className="block underline" href="/support">Contact support</a></div>:this.props.children;}
}
