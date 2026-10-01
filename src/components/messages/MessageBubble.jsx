import { format } from "date-fns";
import MessageActions from "@/components/messages/MessageActions";
import MessageMedia from "@/components/messages/MessageMedia";
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
  const hasMedia = !!message.media_url && message.media_type === "image";

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
          className={`max-w-[78%] rounded-2xl ${
          hasMedia ? "p-1.5" : "px-3.5 py-2"} ${
          mine ?
          "bg-foreground text-background rounded-br-md" :
          "bg-foreground/[0.07] text-foreground rounded-bl-md"} ${
          highlight ? "ring-2 ring-foreground/50" : ""}`
          }>
          
          {reply &&
          <button
            onClick={() => onJumpTo?.(reply.id)}
            className={`block max-w-full text-left mb-1.5 pl-2 border-l-2 ${
            mine ? "border-background/50" : "border-foreground/30"} ${
            hasMedia ? "mx-1.5 mt-1" : ""}`
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
              
              {reply.text || (reply.media_type === "image" ? "📷 Photo" : "Attachment")}
            </div>
          </button>
          }

          {hasMedia && <MessageMedia fileUri={message.media_url} />}

          {message.text &&
          <p
            className={`text-sm whitespace-pre-wrap break-words selectable-content ${
            hasMedia ? "px-1.5 pt-1.5 pb-0.5" : ""}`
            }>
            
              {message.text}
            </p>
          }

          <div
            className={`text-[10px] mt-1 text-right ${
            hasMedia ? "px-1.5 pb-0.5" : ""} ${
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