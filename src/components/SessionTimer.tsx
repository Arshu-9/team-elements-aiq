import { useSessionTimer } from "@/hooks/useSessionTimer";
import { Clock } from "lucide-react";

interface SessionTimerProps {
  expiresAt: string;
  className?: string;
}

export const SessionTimer = ({ expiresAt, className = "" }: SessionTimerProps) => {
  const { timeLeft, isExpired } = useSessionTimer(expiresAt);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="w-4 h-4" />
      <span className={`font-mono ${isExpired ? "text-red-500" : "text-primary"}`}>
        {timeLeft}
      </span>
    </div>
  );
};
