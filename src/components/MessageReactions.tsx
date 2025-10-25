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

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {Object.entries(groupedReactions).map(([emoji, reactions]) => (
        <button
          key={emoji}
          onClick={() => addReaction(emoji)}
          className="text-xs px-2 py-0.5 rounded-full glass hover:bg-primary/20 transition-colors flex items-center gap-1"
        >
          <span>{emoji}</span>
          <span className="text-muted-foreground">{reactions.length}</span>
        </button>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full hover:bg-primary/20"
          >
            <Smile className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="glass border-primary/30 w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addReaction(emoji)}
                className="text-xl p-2 rounded hover:bg-primary/20 transition-colors"
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
