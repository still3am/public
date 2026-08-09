const EMOJIS = [
  "😀","😂","🥰","😎","🤔","😴","😭","😡",
  "👍","👎","❤️","🔥","✨","🎉","💯","🤝",
  "🙏","👏","🎶","🎵","🥳","😱","🤯","🥺",
  "😏","🤗","💀","🫶","✌️","🤙","👋","💪",
  "🧠","👀","✅","❌","⭐","🌟","⚡","🚀",
];

export default function EmojiPicker({ onSelect }) {
  return (
    <div className="border-t border-border/30 bg-background px-2 py-2 max-h-44 overflow-y-auto">
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJIS.map((e, i) => (
          <button
            key={i}
            onClick={() => onSelect(e)}
            className="w-9 h-9 grid place-items-center text-xl rounded-lg hover:bg-foreground/5 active:scale-90 transition"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}