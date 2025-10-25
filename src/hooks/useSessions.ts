import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSessions = async () => {
      const { data } = await (supabase as any)
        .from("session_participants")
        .select(`
          session_id,
          sessions (
            id,
            name,
            session_key,
            expires_at,
            security_level,
            is_active,
            session_participants (user_id)
          )
        `)
        .eq("user_id", user.id);

      if (data) {
        const formatted = data
          .filter((s: any) => s.sessions?.is_active)
          .map((s: any) => {
            const session = s.sessions;
            const expiresAt = new Date(session.expires_at);
            const now = new Date();
            const timeLeft = Math.max(0, expiresAt.getTime() - now.getTime());
            const minutesLeft = Math.floor(timeLeft / 60000);

            return {
              id: session.id,
              name: session.name,
              participants: session.session_participants?.length || 0,
              timeLeft: minutesLeft > 0 ? `${minutesLeft}m` : "Expired",
              security: session.security_level,
            };
          });

        setSessions(formatted);
      }
      setLoading(false);
    };

    fetchSessions();

    // Subscribe to realtime updates for sessions
    const sessionsChannel = supabase
      .channel("sessions-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    // Subscribe to realtime updates for session participants
    const participantsChannel = supabase
      .channel("participants-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_participants",
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [user]);

  return { sessions, loading };
};
