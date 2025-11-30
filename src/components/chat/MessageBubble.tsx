import { useState } from "react";
import { MessageReactions } from "@/components/MessageReactions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  id: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
  isGrouped?: boolean;
  isRead?: boolean;
  chatMode?: string;
  onLongPress?: (messageId: string) => void;
}

export const MessageBubble = ({
  id,
  content,
  timestamp,
  isOwn,
  senderName,
  senderAvatar,
  isGrouped = false,
  isRead = false,
  chatMode,
  onLongPress,
}: MessageBubbleProps) => {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseDown = () => {
    const timer = setTimeout(() => {
      onLongPress?.(id);
    }, 500);
    setPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 animate-fade-in",
        isOwn ? "justify-end" : "justify-start",
        isGrouped && "mt-1"
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      {!isOwn && !isGrouped && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarImage src={senderAvatar} alt={senderName} />
          <AvatarFallback className="text-xs">
            {senderName?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      {!isOwn && isGrouped && <div className="w-8" />}

      <div className="flex flex-col max-w-[70%]">
        {!isOwn && !isGrouped && (
          <span className="text-xs text-muted-foreground ml-3 mb-1">{senderName}</span>
        )}

        <div className="relative group">
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 shadow-sm transition-smooth",
              isOwn
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "glass rounded-tl-sm",
              isGrouped && isOwn && "rounded-tr-2xl",
              isGrouped && !isOwn && "rounded-tl-2xl"
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>

            {chatMode === "self-destruct" && (
              <p className="text-xs opacity-50 mt-1 flex items-center gap-1">
                💣 Self-destruct
              </p>
            )}
          </div>

          <div
            className={cn(
              "absolute -bottom-5 text-[10px] text-muted-foreground transition-smooth",
              isOwn ? "right-0" : "left-0",
              showTimestamp ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="flex items-center gap-1">
              <span>{new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              {isOwn && <span className="text-primary">{isRead ? "✓✓" : "✓"}</span>}
            </div>
          </div>

          <MessageReactions messageId={id} />
        </div>
      </div>
    </div>
  );
};
