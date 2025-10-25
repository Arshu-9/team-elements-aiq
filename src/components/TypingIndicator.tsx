interface TypingIndicatorProps {
  typingUsers: Array<{ user_id: string; display_name?: string }>;
}

export const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
  if (typingUsers.length === 0) return null;

  const names = typingUsers
    .map((u) => u.display_name || "Someone")
    .slice(0, 3)
    .join(", ");

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 animate-fade-in">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span>{names} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
    </div>
  );
};
