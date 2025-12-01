import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface ConnectionStatusProps {
  status: ConnectionStatus;
  queueLength?: number;
}

export const ConnectionStatus = ({ status, queueLength = 0 }: ConnectionStatusProps) => {
  if (status === "connected" && queueLength === 0) return null;

  return (
    <div
      className={cn(
        "fixed top-16 left-1/2 -translate-x-1/2 z-50 glass rounded-full px-4 py-2 flex items-center gap-2 shadow-lg animate-fade-in",
        status === "disconnected" && "border-destructive/50"
      )}
    >
      {status === "disconnected" ? (
        <>
          <WifiOff className="w-4 h-4 text-destructive" />
          <span className="text-xs text-destructive font-medium">
            {queueLength > 0 ? `${queueLength} message${queueLength > 1 ? "s" : ""} pending` : "Offline"}
          </span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">Reconnecting...</span>
        </>
      )}
    </div>
  );
};
