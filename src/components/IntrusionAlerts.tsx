import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, Clock } from "lucide-react";
import { Card } from "./ui/card";

interface IntrusionAttempt {
  id: string;
  attempted_by_user_id?: string;
  attempt_timestamp: string;
  device_info?: any;
  ip_address?: string;
  reason: string;
}

interface IntrusionAlertsProps {
  sessionId: string;
  isCreator: boolean;
}

export const IntrusionAlerts = ({ sessionId, isCreator }: IntrusionAlertsProps) => {
  const [attempts, setAttempts] = useState<IntrusionAttempt[]>([]);

  useEffect(() => {
    if (!isCreator) return;

    const fetchAttempts = async () => {
      const { data, error } = await (supabase as any)
        .from("intrusion_attempts")
        .select("*")
        .eq("session_id", sessionId)
        .order("attempt_timestamp", { ascending: false })
        .limit(5);

      if (!error && data) {
        setAttempts(data);
      }
    };

    fetchAttempts();

    const channel = supabase
      .channel(`intrusion-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "intrusion_attempts",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setAttempts((prev) => [payload.new as IntrusionAttempt, ...prev.slice(0, 4)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isCreator]);

  if (!isCreator || attempts.length === 0) return null;

  return (
    <Card className="glass border-red-500/50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-red-500">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-semibold">Security Alerts</h3>
      </div>
      
      <div className="space-y-2">
        {attempts.map((attempt) => (
          <div key={attempt.id} className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-500">{attempt.reason}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(attempt.attempt_timestamp).toLocaleString()}</span>
                </div>
                {attempt.ip_address && (
                  <p className="text-xs text-muted-foreground mt-1">IP: {attempt.ip_address}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
