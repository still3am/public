import { format } from "date-fns";

export default function MessageBubble({ message, mine }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
        mine ?
        "bg-foreground text-background rounded-br-md" :
        "bg-foreground/[0.07] text-foreground rounded-bl-md"}`
        }>
        
        {message.text &&
        <p className="text-sm whitespace-pre-wrap break-words selectable-content">
            {message.text}
          </p>
        }
        <div
          className={`text-[10px] mt-1 text-right ${
          mine ? "text-background/60" : "text-foreground/45"}`
          }>
          
          {format(new Date(message.created_date), "h:mm a")}
          {message.edited ? " · edited" : ""}
        </div>
      </div>
    </div>);

}