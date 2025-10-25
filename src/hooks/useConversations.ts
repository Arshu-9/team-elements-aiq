import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data: participants } = await (supabase as any)
        .from("conversation_participants")
        .select(`
          conversation_id,
          conversations (
            id,
            type,
            created_at,
            conversation_participants (
              profiles (id, display_name, username, status)
            ),
            messages (
              id,
              content,
              created_at,
              is_read,
              sender_id
            )
          )
        `)
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

      if (participants) {
        const formatted = participants.map((p: any) => {
          const conv = p.conversations;
          const otherParticipant = conv.conversation_participants.find(
            (cp: any) => cp.profiles.id !== user.id
          )?.profiles;
          
          const lastMessage = conv.messages?.[conv.messages.length - 1];
          const unreadCount = conv.messages?.filter(
            (m: any) => !m.is_read && m.sender_id !== user.id
          ).length || 0;

          return {
            id: conv.id,
            name: otherParticipant?.display_name || "Unknown",
            username: otherParticipant?.username,
            lastMessage: lastMessage?.content || "No messages yet",
            time: lastMessage?.created_at || conv.created_at,
            unread: unreadCount,
            online: otherParticipant?.status === "online",
          };
        });
        
        setConversations(formatted);
      }
      setLoading(false);
    };

    fetchConversations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { conversations, loading };
};
