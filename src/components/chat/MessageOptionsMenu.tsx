import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Reply, Heart, Pin, Trash2 } from "lucide-react";

interface MessageOptionsMenuProps {
  children: React.ReactNode;
  onCopy: () => void;
  onReply: () => void;
  onReact: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export const MessageOptionsMenu = ({
  children,
  onCopy,
  onReply,
  onReact,
  onPin,
  onDelete,
  canDelete,
}: MessageOptionsMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="glass border-border/30">
        <ContextMenuItem onClick={onReply} className="gap-2">
          <Reply className="w-4 h-4" />
          Reply
        </ContextMenuItem>
        <ContextMenuItem onClick={onReact} className="gap-2">
          <Heart className="w-4 h-4" />
          React
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopy} className="gap-2">
          <Copy className="w-4 h-4" />
          Copy
        </ContextMenuItem>
        {onPin && (
          <ContextMenuItem onClick={onPin} className="gap-2">
            <Pin className="w-4 h-4" />
            Pin Message
          </ContextMenuItem>
        )}
        {canDelete && onDelete && (
          <ContextMenuItem
            onClick={onDelete}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
