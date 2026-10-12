/** @param {any} props */
export default function StatusMessage({ value, editMode, onChange }) {
  if (editMode) {
    return (
      <div className="mt-3 w-full max-w-2xl mx-auto md:mx-0">
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What's your current mood?"
          maxLength={140}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm italic" />
        
      </div>);

  }
  if (!value) return null;
  return (
    <p className="mt-3 w-full max-w-2xl mx-auto md:mx-0 text-sm italic text-foreground/60 leading-relaxed break-words">
      {value}
    </p>
  );




}