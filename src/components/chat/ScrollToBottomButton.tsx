import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollToBottomButtonProps {
  show: boolean;
  hasNewMessages?: boolean;
  onClick: () => void;
}

export const ScrollToBottomButton = ({
  show,
  hasNewMessages,
  onClick,
}: ScrollToBottomButtonProps) => {
  return (
    <Button
      size="icon"
      className={cn(
        "fixed bottom-24 right-6 z-30 rounded-full shadow-lg transition-all duration-300",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
        hasNewMessages && "animate-bounce"
      )}
      onClick={onClick}
    >
      <ChevronDown className="w-5 h-5" />
      {hasNewMessages && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-background" />
      )}
    </Button>
  );
};
