import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSyncedChatMode = (sessionId: string | undefined) => {
  const [chatMode, setChatMode] = useState<'normal' | 'self-destruct'>('normal');

  useEffect(() => {
    if (!sessionId) return;

    // Fetch initial chat mode
    const fetchChatMode = async () => {
      const { data } = await (supabase as any)
        .from("session_chat_state")
        .select("chat_mode")
        .eq("session_id", sessionId)
        .single();

      if (data) {
        setChatMode(data.chat_mode);
      } else {
        // Create initial state
        await (supabase as any)
          .from("session_chat_state")
          .insert({ session_id: sessionId, chat_mode: 'normal' });
      }
    };

    fetchChatMode();

    // Subscribe to chat mode changes
    const channel = supabase
      .channel(`session-chat-mode-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_chat_state",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new && 'chat_mode' in payload.new) {
            setChatMode(payload.new.chat_mode as 'normal' | 'self-destruct');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const updateChatMode = async (newMode: 'normal' | 'self-destruct') => {
    if (!sessionId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any)
        .from("session_chat_state")
        .upsert({
          session_id: sessionId,
          chat_mode: newMode,
          updated_by: user.id,
        });
    } catch (error) {
      console.error("Error updating chat mode:", error);
    }
  };

  return { chatMode, updateChatMode };
};
