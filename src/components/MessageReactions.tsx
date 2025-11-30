import { useMessageReactions } from "@/hooks/useMessageReactions";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Smile } from "lucide-react";

interface MessageReactionsProps {
  messageId: string;
}

const QUICK_EMOJIS = ["❤️", "😂", "👍", "🔥", "😮", "😢", "🎉", "👏"];

export const MessageReactions = ({ messageId }: MessageReactionsProps) => {
  const { groupedReactions, addReaction } = useMessageReactions(messageId);

  if (Object.keys(groupedReactions).length === 0) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-smooth">
            <div className="glass rounded-full p-1 shadow-lg border border-border/30 hover:scale-110 transition-smooth">
              <Smile className="w-3 h-3 text-muted-foreground" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="glass border-border/30 w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addReaction(emoji)}
                className="text-xl p-2 rounded hover:bg-accent transition-smooth transform hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap mt-2">
      <div className="flex items-center gap-1 glass rounded-full px-2 py-1 shadow-sm border border-border/20">
        {Object.entries(groupedReactions).map(([emoji, reactions]) => (
          <button
            key={emoji}
            onClick={() => addReaction(emoji)}
            className="text-xs px-2 py-1 rounded-full hover:bg-accent transition-smooth flex items-center gap-1 transform hover:scale-110"
          >
            <span>{emoji}</span>
            <span className="text-muted-foreground font-medium">{reactions.length}</span>
          </button>
        ))}
      </div>
      
      <Popover>
        <PopoverTrigger asChild>
          <button className="glass rounded-full p-1.5 shadow-sm border border-border/20 hover:bg-accent transition-smooth transform hover:scale-110">
            <Smile className="w-3 h-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="glass border-border/30 w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addReaction(emoji)}
                className="text-xl p-2 rounded hover:bg-accent transition-smooth transform hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
