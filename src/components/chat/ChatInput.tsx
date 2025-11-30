import { useState, useRef } from "react";
import { Send, Smile, Paperclip, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  replyTo?: {
    content: string;
    sender: string;
  };
  onCancelReply?: () => void;
  onAttachment?: () => void;
}

const EMOJIS = ["😊", "😂", "❤️", "👍", "🔥", "😮", "😢", "🎉", "👏", "💯", "🙏", "😍"];

export const ChatInput = ({
  value,
  onChange,
  onSend,
  onTyping,
  disabled,
  replyTo,
  onCancelReply,
  onAttachment,
}: ChatInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    onTyping?.(e.target.value.length > 0);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(value + emoji);
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/30 backdrop-blur-xl">
      <div className="max-w-screen-xl mx-auto px-4 py-3">
        {replyTo && (
          <div className="mb-2 glass rounded-xl p-3 border-l-4 border-primary flex items-start justify-between animate-fade-in">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary mb-1">
                Replying to {replyTo.sender}
              </p>
              <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full ml-2 flex-shrink-0"
              onClick={onCancelReply}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-accent transition-smooth flex-shrink-0"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="glass border-border/30 w-auto p-2">
              <div className="grid grid-cols-6 gap-1">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="text-xl p-2 rounded hover:bg-accent transition-smooth"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {onAttachment && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-accent transition-smooth flex-shrink-0"
              onClick={onAttachment}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
          )}

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            disabled={disabled}
            className={cn(
              "flex-1 min-h-[44px] max-h-[120px] resize-none glass border-border/30 rounded-3xl py-3 px-4 transition-smooth",
              "focus-visible:ring-1 focus-visible:ring-primary"
            )}
            rows={1}
          />

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full transition-smooth flex-shrink-0",
              isRecording ? "bg-destructive text-destructive-foreground" : "hover:bg-accent"
            )}
            onClick={() => setIsRecording(!isRecording)}
          >
            <Mic className="w-5 h-5" />
          </Button>

          <Button
            size="icon"
            className={cn(
              "rounded-full transition-smooth flex-shrink-0",
              value.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90 scale-100"
                : "bg-muted text-muted-foreground scale-90 pointer-events-none"
            )}
            onClick={handleSend}
            disabled={!value.trim() || disabled}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
