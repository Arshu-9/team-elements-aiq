import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Eye, Flame, MessageSquare } from "lucide-react";

interface ChatModeSelectorProps {
  mode: 'normal' | 'spy' | 'burn';
  onModeChange: (mode: 'normal' | 'spy' | 'burn') => void;
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
          <SelectItem value="spy">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-orange-500" />
              <div className="text-left">
                <div className="font-semibold">Spy Mode</div>
                <div className="text-xs text-muted-foreground">No logs saved, temporary only</div>
              </div>
            </div>
          </SelectItem>
          <SelectItem value="burn">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-500" />
              <div className="text-left">
                <div className="font-semibold">Burn Mode</div>
                <div className="text-xs text-muted-foreground">Auto-delete after read</div>
              </div>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {mode === 'spy' && (
        <p className="text-xs text-muted-foreground bg-orange-500/10 p-2 rounded border border-orange-500/30">
          🕵️ Once seen, it's gone — not even the sender can recover it.
        </p>
      )}
      {mode === 'burn' && (
        <p className="text-xs text-muted-foreground bg-red-500/10 p-2 rounded border border-red-500/30">
          🔥 Ultimate discretion — messages self-destruct after reading.
        </p>
      )}
    </div>
  );
};
