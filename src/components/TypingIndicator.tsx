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
    <div className="flex items-center gap-3 px-4 py-3 animate-slide-in-right">
      <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1">
          <span 
            className="w-2 h-2 bg-primary rounded-full animate-bounce" 
            style={{ animationDelay: "0ms", animationDuration: "1s" }} 
          />
          <span 
            className="w-2 h-2 bg-primary rounded-full animate-bounce" 
            style={{ animationDelay: "200ms", animationDuration: "1s" }} 
          />
          <span 
            className="w-2 h-2 bg-primary rounded-full animate-bounce" 
            style={{ animationDelay: "400ms", animationDuration: "1s" }} 
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {names} {typingUsers.length === 1 ? "is" : "are"} typing...
        </span>
      </div>
    </div>
  );
};
