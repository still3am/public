import { format } from "date-fns";
import MessageActions from "@/components/messages/MessageActions";
import MessageReactions from "@/components/messages/MessageReactions";
import { parseReactions, parseReply } from "@/lib/messaging";

export default function MessageBubble({
  message,
  mine,
  myId,
  highlight = false,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onJumpTo,
}) {
  const reply = parseReply(message.reply_preview);
  const reactions = parseReactions(message.reactions);
  const hasReactions = Object.values(reactions).some((ids) => ids?.length);

  return (
    <div id={`msg-${message.id}`} className="group">
      <div className={`flex items-end gap-1 ${mine ? "justify-end" : "justify-start"}`}>
        {mine &&
        <MessageActions
          message={message}
          mine
          onReact={onReact}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete} />

        }

        <div
          className={`max-w-[78%] rounded-2xl px-3.5 py-2 transition-shadow ${
          mine ?
          "bg-foreground text-background rounded-br-md" :
          "bg-foreground/[0.07] text-foreground rounded-bl-md"} ${
          highlight ? "ring-2 ring-foreground/50" : ""}`
          }>
          
          {reply &&
          <button
            onClick={() => onJumpTo?.(reply.id)}
            className={`block max-w-full text-left mb-1.5 pl-2 border-l-2 ${
            mine ? "border-background/50" : "border-foreground/30"}`
            }>
            
            <div
              className={`text-[11px] font-semibold truncate ${
              mine ? "text-background/80" : "text-foreground/70"}`
              }>
              
              {reply.sender_name || "Reply"}
            </div>
            <div
              className={`text-[11px] truncate ${
              mine ? "text-background/60" : "text-foreground/55"}`
              }>
              
              {reply.text || "Attachment"}
            </div>
          </button>
          }

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

        {!mine &&
        <MessageActions
          message={message}
          mine={false}
          onReact={onReact}
          onReply={onReply} />

        }
      </div>

      {hasReactions &&
      <div className={`mt-1 flex ${mine ? "justify-end" : "justify-start"}`}>
          <MessageReactions reactions={reactions} myId={myId} onReact={onReact} />
        </div>
      }
    </div>);

}