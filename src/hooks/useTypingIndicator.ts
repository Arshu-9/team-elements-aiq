import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingUser {
  user_id: string;
  display_name?: string;
}

export const useTypingIndicator = (sessionId: string | undefined) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  let typingTimeout: NodeJS.Timeout;

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`typing-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const { data: profile } = await (supabase as any)
              .from("profiles")
              .select("display_name")
              .eq("id", payload.new.user_id)
              .single();

            setTypingUsers((prev) => {
              const filtered = prev.filter((u) => u.user_id !== payload.new.user_id);
              if (payload.new.is_typing) {
                return [
                  ...filtered,
                  { user_id: payload.new.user_id, display_name: profile?.display_name || "Someone" },
                ];
              }
              return filtered;
            });
          } else if (payload.eventType === "DELETE") {
            setTypingUsers((prev) => prev.filter((u) => u.user_id !== payload.old.user_id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const setTyping = async (isTyping: boolean) => {
    if (!sessionId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (typingTimeout) clearTimeout(typingTimeout);

      if (isTyping) {
        await (supabase as any).from("typing_indicators").upsert({
          session_id: sessionId,
          user_id: user.id,
          is_typing: true,
          updated_at: new Date().toISOString(),
        });

        typingTimeout = setTimeout(() => {
          setTyping(false);
        }, 3000);
      } else {
        await (supabase as any)
          .from("typing_indicators")
          .delete()
          .eq("session_id", sessionId)
          .eq("user_id", user.id);
      }
    } catch (error) {
      console.error("Error updating typing indicator:", error);
    }
  };

  return { typingUsers, setTyping };
};
