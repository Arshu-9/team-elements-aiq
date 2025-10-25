import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Bomb, MessageSquare } from "lucide-react";

interface ChatModeSelectorProps {
  mode: 'normal' | 'self-destruct';
  onModeChange: (mode: 'normal' | 'self-destruct') => void;
}

export const ChatModeSelector = ({ mode, onModeChange }: ChatModeSelectorProps) => {
  return (
    <div className="space-y-2">
      <Select value={mode} onValueChange={onModeChange}>
        <SelectTrigger className="glass border-primary/30 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="glass">
          <SelectItem value="normal">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-500" />
              <div className="text-left">
                <div className="font-semibold">Normal Mode</div>
                <div className="text-xs text-muted-foreground">Standard secure E2EE chat</div>
              </div>
            </div>
          </SelectItem>
          <SelectItem value="self-destruct">
            <div className="flex items-center gap-2">
              <Bomb className="w-4 h-4 text-red-500" />
              <div className="text-left">
                <div className="font-semibold">Self-Destruct Mode</div>
                <div className="text-xs text-muted-foreground">Messages vanish 10s after being seen</div>
              </div>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {mode === 'self-destruct' && (
        <p className="text-xs text-muted-foreground bg-red-500/10 p-2 rounded border border-red-500/30">
          💣 Messages will self-destruct 10 seconds after being read by all participants
        </p>
      )}
    </div>
  );
};
