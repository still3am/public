import {forwardRef,useState} from "react";
import {Eye,EyeOff} from "lucide-react";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

const PasswordInput=forwardRef(function PasswordInput({className,...props},ref){
 const [visible,setVisible]=useState(false);
 return <div className="relative"><Input {...props} ref={ref} type={visible?"text":"password"} className={cn(className,"pr-12")}/><button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full text-muted-foreground hover:text-foreground" onClick={()=>setVisible(value=>!value)} aria-label={visible?"Hide password":"Show password"} aria-pressed={visible} aria-controls={props.id}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>;
});
export default PasswordInput;
