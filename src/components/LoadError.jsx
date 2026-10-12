import { AlertCircle, RotateCw } from 'lucide-react';
export default function LoadError({message='This screen could not refresh. Your saved data is unchanged.',onRetry}){
 return <div role="alert" className="max-w-lg mx-auto my-10 border rounded-2xl p-5 space-y-3"><AlertCircle size={22}/><p className="text-sm">{message}</p><button onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"><RotateCw size={15}/>Retry</button></div>;
}
